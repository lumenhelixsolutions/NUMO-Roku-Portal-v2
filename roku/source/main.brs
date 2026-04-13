' NUMO Roku Thin Client — channel entry point.
'
' Creates the main SceneGraph screen, launches NUMOScene, and pumps
' the message port so the scene can run its StreamTask indefinitely.

Sub Main(args As Dynamic)
    screen = CreateObject("roSGScreen")
    port   = CreateObject("roMessagePort")
    screen.SetMessagePort(port)
    screen.CreateScene("NUMOScene")
    screen.Show()

    While True
        msg = Wait(0, port)
        If Type(msg) = "roSGScreenEvent"
            If msg.IsScreenClosed() Then Return
        End If
    End While
End Sub
