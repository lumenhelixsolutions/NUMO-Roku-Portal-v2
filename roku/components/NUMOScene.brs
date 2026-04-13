' NUMOScene.brs — Main SceneGraph scene for the NUMO Roku Thin Client.
'
' Responsibilities
' ────────────────
'   • Launch StreamTask and configure its serverUrl.
'   • Observe StreamTask output fields and update the UI accordingly.
'   • Render semi-transparent element overlays on each incoming CUBIT frame.
'   • Intercept Roku remote D-pad events, map them to NUMO D₈ key names,
'     and set StreamTask.dpadKey to trigger transmission to the BYOS server.
'   • Track local focus index to highlight the active overlay rectangle.
'
' D₈ key mapping (mirrors server/src/navigation/dpad.ts)
' ──────────────────────────────────────────────────────
'   Roku key  →  D₈ operation  →  NUMO key name
'   Right     →  R  (CW rot.)  →  "Right"
'   Left      →  R⁻¹           →  "Left"
'   Up        →  S  (reflect)  →  "Up"
'   Down      →  S  (reflect)  →  "Down"
'   OK/Select →  confirm        →  "Select"
'   Back      →  reset          →  "Back"

' ── Default server settings ───────────────────────────────────────────────────
' Override by deploying with a manifest that sets BYOS_HOST / BYOS_PORT,
' or by editing these constants before sideloading the channel.
Const DEFAULT_SERVER_IP   = "192.168.1.100"
Const DEFAULT_SERVER_PORT = "9000"

' ── Element role colour map ───────────────────────────────────────────────────
' Each role is rendered with a distinct semi-transparent colour so the operator
' can see the semantic structure of the streamed page at a glance.
Function RoleColor(role As String) As String
    If role = "button" Then Return "0x4488FFAA"   ' blue — interactive button
    If role = "link"   Then Return "0x44FF88AA"   ' green — navigable link
    If role = "input"  Then Return "0xFF884444"   ' red — text / form input
    If role = "text"   Then Return "0x44444488"   ' dark — readable content
    Return "0x66666666"                            ' grey — other/unknown
End Function

' ── Lifecycle ─────────────────────────────────────────────────────────────────

Sub Init()
    m.focusIndex = 0
    m.elements   = []

    ' Create and start the background streaming task.
    m.task = CreateObject("roSGNode", "StreamTask")
    m.task.serverUrl = "ws://" + DEFAULT_SERVER_IP + ":" + DEFAULT_SERVER_PORT
    m.task.ObserveField("status",        "OnStatusChanged")
    m.task.ObserveField("frameInfo",     "OnFrameInfoChanged")
    m.task.ObserveField("frameElements", "OnFrameElementsChanged")
    m.task.ObserveField("telemetry",     "OnTelemetryChanged")
    m.task.ObserveField("aiResponse",    "OnAiResponseChanged")
    m.task.ObserveField("agentLine",     "OnAgentLineChanged")
    m.task.control = "RUN"
End Sub

' ── Field observers (called in the render thread) ─────────────────────────────

Sub OnStatusChanged()
    m.top.FindNode("statusLabel").text = "NUMO — " + m.task.status
End Sub

Sub OnFrameInfoChanged()
    info = ParseJson(m.task.frameInfo)
    If info = invalid Then Return
    pasStr = Str(Int(info.pas * 1000) / 1000)
    m.top.FindNode("pasLabel").text = "PAS: " + pasStr + "  LOD: " + Str(info.lod)
End Sub

Sub OnFrameElementsChanged()
    elemJson = m.task.frameElements
    If elemJson = "" Or elemJson = invalid Then Return
    m.elements = ParseJson(elemJson)
    If m.elements = invalid Then m.elements = []
    ' Keep focus index within bounds after an element-count change.
    If m.focusIndex >= m.elements.Count() Then m.focusIndex = 0
    RenderOverlays()
End Sub

Sub OnTelemetryChanged()
    t = ParseJson(m.task.telemetry)
    If t = invalid Then Return
    m.top.FindNode("telemetryLabel").text = _
        "seq:" + Str(t.seq) + "  el:" + Str(t.elements) + _
        "  t:" + Str(Int(t.t * 1000) / 1000)
End Sub

Sub OnAiResponseChanged()
    resp = ParseJson(m.task.aiResponse)
    If resp = invalid Then Return
    m.top.FindNode("aiLabel").text = "[AI] " + resp.response
End Sub

Sub OnAgentLineChanged()
    line = ParseJson(m.task.agentLine)
    If line = invalid Then Return
    m.top.FindNode("aiLabel").text = "[Agent/" + line.source + "] " + line.text
End Sub

' ── Element overlay rendering ─────────────────────────────────────────────────
'
' Each interactive element received from the CUBIT decoder is rendered as a
' semi-transparent Rectangle at its bounding-box position.
'
' Coordinates are server-viewport pixels (1920×1080).  Roku's FHD resolution
' is also 1920×1080, so no scaling is required when ui_resolutions=fhd.
' If you target HD-only (1280×720), divide x/w by 1.5 and y/h by 1.5.

Sub RenderOverlays()
    group = m.top.FindNode("overlayGroup")

    ' Clear all existing overlay children efficiently.
    While group.GetChildCount() > 0
        group.RemoveChildIndex(0)
    End While

    If m.elements = invalid Or m.elements.Count() = 0 Then Return

    For idx = 0 To m.elements.Count() - 1
        elem = m.elements[idx]

        rect             = CreateObject("roSGNode", "Rectangle")
        rect.width       = elem.w
        rect.height      = elem.h
        rect.translation = [elem.x, elem.y]

        ' Focused element gets a bright white highlight; others use role colour.
        If idx = m.focusIndex
            rect.color = "0xFFFFFF55"
        Else
            rect.color = RoleColor(elem.role)
        End If

        group.AppendChild(rect)
    End For
End Sub

' ── D-pad key handling ────────────────────────────────────────────────────────
'
' Roku sends key events as strings to OnKeyEvent().  Map them to the NUMO D₈
' key names expected by the BYOS server (handleDpad in dpad.ts) and update the
' local focus index for immediate visual feedback before the server responds.

Function OnKeyEvent(key As String, press As Boolean) As Boolean
    If Not press Then Return False

    Select key
        Case "right"
            AdvanceFocus(1)
            SendDpad("Right")
        Case "left"
            AdvanceFocus(-1)
            SendDpad("Left")
        Case "up"
            AdvanceFocusByHalf(1)
            SendDpad("Up")
        Case "down"
            AdvanceFocusByHalf(-1)
            SendDpad("Down")
        Case "OK"
            SendDpad("Select")
        Case "back"
            m.focusIndex = 0
            RenderOverlays()
            SendDpad("Back")
        Case Else
            Return False
    End Select

    Return True
End Function

' Move focus by `delta` steps, wrapping around the element list.
Sub AdvanceFocus(delta As Integer)
    count = m.elements.Count()
    If count = 0 Then Return
    m.focusIndex = (m.focusIndex + delta + count) Mod count
    RenderOverlays()
End Sub

' Move focus by half the element count (mirrors the D₈ S-reflection jump).
Sub AdvanceFocusByHalf(direction As Integer)
    count = m.elements.Count()
    If count = 0 Then Return
    delta = Int(count / 2) * direction
    If delta = 0 Then delta = direction
    m.focusIndex = (m.focusIndex + delta + count) Mod count
    RenderOverlays()
End Sub

' Forward a D-pad key name to StreamTask for transmission to the BYOS server.
Sub SendDpad(dpadKey As String)
    m.task.dpadKey = dpadKey
End Sub
