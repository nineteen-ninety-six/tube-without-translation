//
//  ViewController.swift
/*
 * Copyright (C) 2025-present Sebastián Dinator (https://github.com/Seva41) - Safari port
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o) - Original project
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * This program is distributed without any warranty; see the license for details.
 */

import Cocoa
import SafariServices
import WebKit

let extensionBundleIdentifier = "com.YouGo.YouTube-No-Translation.Extension"

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

        self.webView.configuration.userContentController.add(self, name: "controller")

        // Load Main.html from Base.lproj directory
        guard let mainURL = Bundle.main.url(forResource: "Main", withExtension: "html", subdirectory: "Base.lproj"),
              let resourceURL = Bundle.main.resourceURL else {
            fatalError("Failed to load Main.html from bundle")
        }
        
        self.webView.loadFileURL(mainURL, allowingReadAccessTo: resourceURL)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show(\(state.isEnabled), false)")
                }
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let messageBody = message.body as? String else {
            return
        }
        
        if messageBody == "open-preferences" {
            SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                DispatchQueue.main.async {
                    NSApplication.shared.terminate(nil)
                }
            }
        } else if messageBody == "get-app-icon" {
            injectAppIcon()
        }
    }
    
    func injectAppIcon() {
        guard let appIcon = NSApp.applicationIconImage,
              let tiffData = appIcon.tiffRepresentation,
              let bitmapImage = NSBitmapImageRep(data: tiffData),
              let pngData = bitmapImage.representation(using: .png, properties: [:]) else {
            return
        }
        
        let base64String = pngData.base64EncodedString()
        let javascript = """
            var img = document.getElementById('app-icon');
            if (img) {
                img.src = 'data:image/png;base64,\(base64String)';
            }
        """
        
        self.webView.evaluateJavaScript(javascript, completionHandler: nil)
    }

}
