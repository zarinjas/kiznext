import Foundation
import Vision
import AppKit

// OCR an image with Vision, printing each line of text plus its normalized
// bounding box (origin top-left, 0..1) so the layout can be reconstructed.
// Usage: swift scripts/ocr.swift <image>

let args = CommandLine.arguments
guard args.count > 1 else {
    print("usage: swift scripts/ocr.swift <image>")
    exit(1)
}
let url = URL(fileURLWithPath: args[1])
guard let img = NSImage(contentsOf: url),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("cannot load image: \(args[1])")
    exit(1)
}

let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cg, options: [:])
do {
    try handler.perform([req])
} catch {
    print("ocr failed: \(error)")
    exit(1)
}

print("image \(cg.width)x\(cg.height)")
for obs in (req.results ?? []) {
    guard let c = obs.topCandidates(1).first else { continue }
    let b = obs.boundingBox // normalized, origin bottom-left
    // Convert to top-left origin.
    let x = b.minX
    let y = 1.0 - b.maxY
    print(String(format: "x=%.3f y=%.3f w=%.3f h=%.3f | %@", x, y, b.width, b.height, c.string))
}
