' rubic.brs — RUBIC-224 Reversible CA Cipher (BrightScript port)
'
' Mirrors the algorithm in server/src/sync/rubic.ts.
'
' Key:      224 bits = 28 bytes, split into 4 × 7-byte rotor seeds.
' CA state: 64 bytes, expanded from seed via XOR diffusion step.
' Warm-up:  8 Rule-90 CA generations before first keystream byte is emitted.
' Rule-90:  next[i] = state[(i-1+n) mod n] XOR state[(i+1) mod n]
' Process:  chain 4 rotors; XOR each data byte with its keystream byte.
' Self-inverse: P(P(M,K),K) = M  — encrypt and decrypt are identical.

Const RUBIC_KEY_BYTES   = 28
Const RUBIC_ROTOR_COUNT = 4
Const RUBIC_SEED_BYTES  = 7     ' KEY_BYTES / ROTOR_COUNT
Const RUBIC_CA_SIZE     = 64
Const RUBIC_WARMUP_GENS = 8

' ── Rule-90 CA step ──────────────────────────────────────────────────────────

' Advance a 64-byte CA state by one Rule-90 generation.
' next[i] = state[(i-1+n) mod n] XOR state[(i+1) mod n]
' Returns the new state as a roByteArray.
Function RubicStepCA(state As Object) As Object
    n    = RUBIC_CA_SIZE
    next = CreateObject("roByteArray")
    next.SetResize(n, false)
    For i = 0 To n - 1
        left  = (i - 1 + n) Mod n
        right = (i + 1) Mod n
        next[i] = BitXor(state[left], state[right])
    End For
    Return next
End Function

' ── Rotor creation ────────────────────────────────────────────────────────────

' Create one CA rotor from a 7-byte seed (roByteArray).
' Returns an AA: { state: roByteArray }
Function RubicCreateRotor(seed As Object) As Object
    state = CreateObject("roByteArray")
    state.SetResize(RUBIC_CA_SIZE, false)

    ' Expand 7-byte seed to 64-byte CA state via XOR diffusion.
    ' Mirrors: this.state[i] = seed[i % SEED_BYTES] ^ ((i * 0x9e3779b9) & 0xff)
    For i = 0 To RUBIC_CA_SIZE - 1
        diffuse = BitAnd(i * &h9e3779b9, &hFF)
        state[i] = BitXor(seed[i Mod RUBIC_SEED_BYTES], diffuse)
    End For

    ' Warm-up: advance the CA RUBIC_WARMUP_GENS generations to destroy seed structure.
    For g = 0 To RUBIC_WARMUP_GENS - 1
        state = RubicStepCA(state)
    End For

    Return {state: state}
End Function

' ── Keystream generation ──────────────────────────────────────────────────────

' Generate `length` bytes of keystream from a rotor, advancing the CA state
' every RUBIC_CA_SIZE bytes (matching the server's CaRotor.keystream() method).
' Returns { keystream: roByteArray, rotor: updated rotor AA }.
Function RubicKeystream(rotor As Object, length As Integer) As Object
    ks    = CreateObject("roByteArray")
    ks.SetResize(length, false)
    state = rotor.state

    For i = 0 To length - 1
        ks[i] = state[i Mod RUBIC_CA_SIZE]
        ' Advance the CA at every CA_SIZE-th byte (same cadence as server).
        If (i + 1) Mod RUBIC_CA_SIZE = 0
            state = RubicStepCA(state)
        End If
    End For

    Return {keystream: ks, rotor: {state: state}}
End Function

' ── Public API ────────────────────────────────────────────────────────────────

' Create a RUBIC context from a 28-byte key (roByteArray, decoded from base64).
' Returns an AA: { rotors: [rotor0, rotor1, rotor2, rotor3] }
Function RubicCreate(key As Object) As Object
    rotors = []
    For r = 0 To RUBIC_ROTOR_COUNT - 1
        seed = CreateObject("roByteArray")
        seed.SetResize(RUBIC_SEED_BYTES, false)
        For b = 0 To RUBIC_SEED_BYTES - 1
            seed[b] = key[r * RUBIC_SEED_BYTES + b]
        End For
        rotors.Push(RubicCreateRotor(seed))
    End For
    Return {rotors: rotors}
End Function

' Process data through all four CA rotors sequentially.
' Because XOR is self-inverse, this serves as both encrypt and decrypt:
'   P(P(M, K), K) = M
'
' data:  roByteArray (input — not mutated)
' rubic: context from RubicCreate() — rotor states are updated in-place so
'        that subsequent calls advance the keystream synchronously with the server.
' Returns a new roByteArray with processed data.
Function RubicProcess(data As Object, rubic As Object) As Object
    ' Work on a mutable copy of the input buffer.
    buf = CreateObject("roByteArray")
    buf.SetResize(data.Count(), false)
    For i = 0 To data.Count() - 1
        buf[i] = data[i]
    End For

    ' Chain through all four rotors, each XOR-ing the buffer with its keystream.
    For r = 0 To RUBIC_ROTOR_COUNT - 1
        ksResult        = RubicKeystream(rubic.rotors[r], buf.Count())
        ks              = ksResult.keystream
        rubic.rotors[r] = ksResult.rotor   ' advance rotor state in-place

        out = CreateObject("roByteArray")
        out.SetResize(buf.Count(), false)
        For i = 0 To buf.Count() - 1
            out[i] = BitXor(buf[i], ks[i])
        End For
        buf = out
    End For

    Return buf
End Function
