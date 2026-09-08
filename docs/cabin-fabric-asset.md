# Cabin fabric detail

Asset: `public/textures/cabin-fabric-v1.png`

Generated with the built-in image-generation tool, September 2026. Actual output: 1254 × 1254. Used as a grayscale detail layer, not as baked cabin lighting. Mirrored wrapping and mip filtering avoid hard tile edges and reduce minification shimmer. The existing olive color, voxel motifs, seams and seat geometry remain independent.

## Generation prompt

Use case: stylized-concept
Asset type: seamless tileable grayscale bitmap fabric detail map for woven seats in a cosy voxel vintage car.
Primary request: Create a square 1024 x 1024 texture representing approximately 0.35 meters square of subtly worn tweed upholstery. Flat orthographic material swatch fills every pixel of the frame. Fine irregular interwoven yarns with small blocky groups, subtle square/voxel grouping, organic varied weave and restrained thread fuzz.
Color palette: purely neutral grayscale, mean brightness approximately 0.6 (153/255), modest contrast so this works as a multiplicative detail layer over an existing olive or tan seat color.
Lighting: completely uniform illumination; diffuse albedo texture only, with no baked directional light or shadows, gradients, highlights or vignette.
Constraints: seamlessly tileable on both axes, continuous edge-to-edge weave, no perspective, no seams, no borders, no objects, no text, no logos, no watermark. Avoid a rigid checkerboard, large plaid, oversized motifs, deep dark gaps, large flecks, dramatic contrast, or a photograph of a fabric swatch resting on a background.
