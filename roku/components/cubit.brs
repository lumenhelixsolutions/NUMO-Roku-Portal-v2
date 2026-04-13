' cubit.brs — 32.C.U.B.I.T. Frame Decoder (BrightScript port)
'
' Mirrors decodeFrame() in server/src/sync/cubit.ts.
'
' Frame layout (big-endian):
'   4 B  magic        = 0x43 0x55 0x42 0x49  ("CUBI")  — plaintext framing
'   4 B  seq          frame sequence number              ╮
'   4 B  ts_hi        timestamp ms, high 32 bits         │
'   4 B  ts_lo        timestamp ms, low  32 bits         │  RUBIC-encrypted
'   2 B  vw           viewport width                     │
'   2 B  vh           viewport height                    │
'   1 B  lod          LOD level (0-2)                    │
'   1 B  pas_u8       PAS × 255 (fixed-point)            │
'   2 B  count        number of elements                 │
'   Per element (273 B each):                            │
'     1 B  role_code  (link=1, button=2, input=3, text=4)│
'     4×4 B  x, y, w, h  bounding box (float32 BE)      │
'     64×4 B manifold vector (float32 BE) — decoded but  ╯
'            not used for basic overlay rendering

Const CUBIT_MAGIC_0 = &h43    ' 'C'
Const CUBIT_MAGIC_1 = &h55    ' 'U'
Const CUBIT_MAGIC_2 = &h42    ' 'B'
Const CUBIT_MAGIC_3 = &h49    ' 'I'

' ── Low-level byte readers ────────────────────────────────────────────────────

' Read 4 bytes as a big-endian 32-bit integer from roByteArray at `offset`.
' The result is a signed 32-bit integer; values ≥ 2^31 appear negative.
Function ReadUint32BE(ba As Object, offset As Integer) As Integer
    b0 = ba[offset]
    b1 = ba[offset + 1]
    b2 = ba[offset + 2]
    b3 = ba[offset + 3]
    Return BitOr(BitOr(BitOr(BitShiftLeft(b0, 24), BitShiftLeft(b1, 16)), BitShiftLeft(b2, 8)), b3)
End Function

' Read 2 bytes as a big-endian unsigned 16-bit integer from roByteArray at `offset`.
Function ReadUint16BE(ba As Object, offset As Integer) As Integer
    Return BitOr(BitShiftLeft(ba[offset], 8), ba[offset + 1])
End Function

' Read 4 bytes as a big-endian IEEE 754 float32 from roByteArray at `offset`.
'
' Extracts sign, biased exponent, and mantissa from individual bytes to avoid
' the undefined-behaviour of arithmetic right-shifting a negative 32-bit integer
' (BrightScript's BitShiftRight is arithmetic, not logical).
Function ReadFloat32BE(ba As Object, offset As Integer) As Float
    b0 = ba[offset]
    b1 = ba[offset + 1]
    b2 = ba[offset + 2]
    b3 = ba[offset + 3]

    ' Float32 bit layout:
    '   bit 31      : sign
    '   bits 30..23 : biased exponent (8 bits)
    '   bits 22..0  : mantissa (23 bits)
    '
    ' In big-endian bytes:
    '   b0 = [s  e7 e6 e5 e4 e3 e2 e1]
    '   b1 = [e0 m22 m21 … m16]
    '   b2 = [m15 … m8]
    '   b3 = [m7  … m0]

    signBit = BitAnd(b0, &h80)
    exp     = BitOr(BitShiftLeft(BitAnd(b0, &h7F), 1), BitShiftRight(b1, 7))
    mant    = BitOr(BitOr(BitShiftLeft(BitAnd(b1, &h7F), 16), BitShiftLeft(b2, 8)), b3)

    Dim value As Float
    If exp = 0
        ' Subnormal number: value = (-1)^s × 2^-126 × (mant / 2^23)
        value = (2.0 ^ -126.0) * (mant / 8388608.0)
    Else If exp = 255
        ' Infinity or NaN — clamp to maximum representable float.
        value = 3.4028235e+38
    Else
        ' Normalised number: value = (-1)^s × 2^(exp-127) × (1 + mant / 2^23)
        value = (2.0 ^ (exp - 127)) * (1.0 + mant / 8388608.0)
    End If

    If signBit <> 0 Then value = -value
    Return value
End Function

' ── Role decoding ─────────────────────────────────────────────────────────────

Function CubitRoleName(code As Integer) As String
    If code = 1 Then Return "link"
    If code = 2 Then Return "button"
    If code = 3 Then Return "input"
    If code = 4 Then Return "text"
    Return "other"
End Function

' ── CUBIT frame decoder ───────────────────────────────────────────────────────

' Decode a raw CUBIT binary frame (roByteArray, including the 4-byte magic)
' using the provided RUBIC context.
'
' rubic is updated in-place: rotor states advance synchronously with the server,
' maintaining the shared keystream position.
'
' Returns an AA on success:
'   { seq, vw, vh, lod, pas, elements: [{role, x, y, w, h}, …] }
' Returns invalid if the frame is too short or the magic is wrong.
Function CubitDecodeFrame(raw As Object, rubic As Object) As Dynamic
    ' Minimum size: 4 (magic) + 20 (header) = 24 bytes.
    If raw.Count() < 24 Then Return invalid

    ' Verify the 4-byte magic "CUBI".
    If raw[0] <> CUBIT_MAGIC_0 Or raw[1] <> CUBIT_MAGIC_1 _
    Or raw[2] <> CUBIT_MAGIC_2 Or raw[3] <> CUBIT_MAGIC_3
        Return invalid
    End If

    ' Copy the encrypted payload (everything after the 4-byte magic).
    payloadLen = raw.Count() - 4
    payload    = CreateObject("roByteArray")
    payload.SetResize(payloadLen, false)
    For i = 0 To payloadLen - 1
        payload[i] = raw[i + 4]
    End For

    ' RUBIC-decrypt the payload (advances rotor states in rubic).
    plain = RubicProcess(payload, rubic)
    If plain = invalid Or plain.Count() < 20 Then Return invalid

    ' ── Parse header (20 bytes) ───────────────────────────────────────────────
    off   = 0
    seq   = ReadUint32BE(plain, off)  : off = off + 4
    off   = off + 8                   ' skip ts_hi + ts_lo (8 bytes)
    vw    = ReadUint16BE(plain, off)  : off = off + 2
    vh    = ReadUint16BE(plain, off)  : off = off + 2
    lod   = plain[off]                : off = off + 1
    pasU8 = plain[off]                : off = off + 1
    count = ReadUint16BE(plain, off)  : off = off + 2

    pas = pasU8 / 255.0

    ' ── Parse elements (273 bytes each) ──────────────────────────────────────
    ' Layout per element:
    '   1 B  role_code
    '   4×4 B  x, y, w, h  (float32 BE)
    '   64×4 B manifold vector (float32 BE) — advanced past, not used for rendering
    elements = []
    For e = 0 To count - 1
        If off + 273 > plain.Count() Then Exit For

        role = CubitRoleName(plain[off]) : off = off + 1
        x    = ReadFloat32BE(plain, off) : off = off + 4
        y    = ReadFloat32BE(plain, off) : off = off + 4
        w    = ReadFloat32BE(plain, off) : off = off + 4
        h    = ReadFloat32BE(plain, off) : off = off + 4

        ' Skip the 64 × float32 manifold vector (256 bytes).
        ' Higher-level NUMO Field analysis can use these vectors; basic overlay
        ' rendering only needs role and bounding-box coordinates.
        off = off + 256

        elements.Push({role: role, x: x, y: y, w: w, h: h})
    End For

    Return {seq: seq, vw: vw, vh: vh, lod: lod, pas: pas, elements: elements}
End Function
