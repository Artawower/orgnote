import UIKit
import Capacitor
import WebViewBackgroundPlugin

class OrgNoteViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WebViewBackgroundPlugin())
    }
}
