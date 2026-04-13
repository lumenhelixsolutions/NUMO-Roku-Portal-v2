' StreamTask.brs — Background WebSocket streaming task.
'
' Connects to the NUMO BYOS server, exchanges handshake to obtain the
' shared RUBIC-224 key, then receives RUBIC-encrypted 32.C.U.B.I.T. frames
' at 32 Hz and decodes them for NUMOScene to render.
'
' Threading model
' ───────────────
'   This script runs in the Task thread.  All communication with NUMOScene
'   uses SceneGraph fields only:
'     • Task reads  m.top.serverUrl / dpadKey / cancel  (set by scene)
'     • Task writes m.top.status / frameInfo / frameElements / …  (read by scene)
'
'   The WebSocket (m.ws) is created and owned here.  When the scene sets
'   dpadKey, the task catches the roSGNodeEvent in the Wait() loop and
'   immediately sends the JSON message to the server.

Sub Init()
    m.port  = CreateObject("roMessagePort")
    m.rubic = invalid
    m.ws    = invalid
End Sub

Sub Run(args As Dynamic)
    serverUrl = m.top.serverUrl
    If serverUrl = "" Or serverUrl = invalid
        m.top.status = "error: serverUrl not set"
        Return
    End If

    m.top.status = "connecting"

    ' Create the WebSocket and route events to our message port.
    m.ws = CreateObject("roWebSocket")
    m.ws.SetUrl(serverUrl)
    m.ws.SetMessagePort(m.port)

    ' Observe task fields so the scene can send D-pad events and cancel the task.
    m.top.ObserveField("dpadKey", m.port)
    m.top.ObserveField("cancel",  m.port)

    ' Main event loop — 50 ms timeout lets us check the cancel flag even when
    ' no WebSocket traffic is arriving.
    While True
        msg = Wait(50, m.port)

        If msg = invalid
            ' Timeout — check cancel flag.
            If m.top.cancel Then Exit While

        Else If Type(msg) = "roWebSocketEvent"
            HandleWebSocketEvent(msg)
            If m.top.status = "disconnected" Or Left(m.top.status, 5) = "error" Then Exit While

        Else If Type(msg) = "roSGNodeEvent"
            Select msg.GetField()
                Case "dpadKey"
                    key = m.top.dpadKey
                    If key <> "" And m.ws <> invalid
                        SendJson({type: "dpad", key: key})
                        m.top.dpadKey = ""
                    End If
                Case "cancel"
                    If m.top.cancel Then Exit While
            End Select
        End If
    End While

    If m.ws <> invalid
        m.ws.Close()
        m.ws = invalid
    End If
    m.top.status = "stopped"
End Sub

' ── WebSocket event dispatcher ────────────────────────────────────────────────

Sub HandleWebSocketEvent(msg As Object)
    Select msg.GetType()
        Case 0   ' Connected
            m.top.status = "connected"

        Case 1   ' Message received
            If msg.IsString()
                HandleJsonMessage(msg.GetString())
            Else If msg.IsByteArray() And m.rubic <> invalid
                HandleBinaryFrame(msg.GetByteArray())
            End If

        Case 2   ' Closed by remote
            m.top.status = "disconnected"

        Case 3   ' Connection error
            m.top.status = "error: connection failed"
    End Select
End Sub

' ── JSON message handler ──────────────────────────────────────────────────────

Sub HandleJsonMessage(raw As String)
    json = ParseJson(raw)
    If json = invalid Then Return

    Select json.type
        Case "handshake"
            ' Extract the base64-encoded RUBIC-224 key and initialise the cipher.
            If json.key <> invalid And json.key <> ""
                keyBytes = CreateObject("roByteArray")
                keyBytes.FromBase64String(json.key)
                m.rubic        = RubicCreate(keyBytes)
                m.top.rubicReady = true
                m.top.status   = "streaming"
            End If

        Case "telemetry"
            m.top.telemetry = raw

        Case "nav"
            m.top.navUpdate = raw

        Case "ai_response"
            m.top.aiResponse = raw

        Case "agent"
            m.top.agentLine = raw

        Case "error"
            print "[NUMO StreamTask] server error: "; raw
    End Select
End Sub

' ── Binary CUBIT frame handler ────────────────────────────────────────────────

Sub HandleBinaryFrame(raw As Object)
    frame = CubitDecodeFrame(raw, m.rubic)
    If frame = invalid
        print "[NUMO StreamTask] malformed CUBIT frame — ignoring"
        Return
    End If

    m.top.frameInfo     = FormatJson({seq: frame.seq, pas: frame.pas, lod: frame.lod, vw: frame.vw, vh: frame.vh})
    m.top.frameElements = FormatJson(frame.elements)
End Sub

' ── Outgoing message helper ───────────────────────────────────────────────────

Sub SendJson(msg As Object)
    If m.ws = invalid Then Return
    m.ws.SendString(FormatJson(msg))
End Sub
