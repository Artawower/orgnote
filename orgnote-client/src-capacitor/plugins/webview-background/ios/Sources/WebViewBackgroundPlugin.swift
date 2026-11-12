import Foundation
import Capacitor
import WebKit

@objc public class WebViewBackgroundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WebViewBackgroundPlugin"
    public let jsName = "WebViewBackground"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setBackgroundColor", returnType: CAPPluginReturnPromise)
    ]
    
    @objc public func setBackgroundColor(_ call: CAPPluginCall) {
        guard let color = call.getString("color") else {
            call.reject("Color is required")
            return
        }
        
        guard let uiColor = UIColor(hex: color) else {
            call.reject("Invalid hex color format: \(color). Expected 6 or 8 character hex string (e.g., #RRGGBB or #RRGGBBAA)")
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.webView else {
                call.reject("WebView not available")
                return
            }
            
            webView.isOpaque = false
            webView.backgroundColor = uiColor
            webView.scrollView.backgroundColor = uiColor
            self?.bridge?.viewController?.view.backgroundColor = uiColor
            
            if let window = self?.bridge?.viewController?.view.window {
                window.backgroundColor = uiColor
            }
            
            call.resolve()
        }
    }
}

extension UIColor {
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let length = hexSanitized.count
        let r, g, b, a: CGFloat
        
        switch length {
        case 6:
            r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
            g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
            b = CGFloat(rgb & 0x0000FF) / 255.0
            a = 1.0
        case 8:
            r = CGFloat((rgb & 0xFF000000) >> 24) / 255.0
            g = CGFloat((rgb & 0x00FF0000) >> 16) / 255.0
            b = CGFloat((rgb & 0x0000FF00) >> 8) / 255.0
            a = CGFloat(rgb & 0x000000FF) / 255.0
        default:
            return nil
        }
        
        self.init(red: r, green: g, blue: b, alpha: a)
    }
}
