# Cabin paint detail texture

Asset: `public/textures/cabin-patina-v1.png` (1254 × 1254 PNG).
Created with the built-in image-generation tool, one request, no retries.
The requested size was 1024 × 1024; the returned size is retained unchanged.

This is a grayscale material-detail layer, not a background or a replacement
car image. The renderer preserves the cabin's existing colors and dynamic
lighting. It uses object-space mapping, mirrored wrapping, mipmaps, linear
filtering and anisotropy. Mirrored wrapping avoids relying on the generated
image's unverified edge-to-edge seamlessness. The map is treated as scalar
data, not an sRGB color photograph.

## Exact generation prompt

```text
Use case: stylized-concept
Asset type: seamless tileable 3D material albedo/detail map, exactly one square 1024x1024 image.
Primary request: a neutral grayscale surface texture of subtly worn matte painted vintage dashboard, for modulating existing olive paint colors at low strength on a live Three.js cosy voxel car. Only the material surface, no cabin image.
Style/medium: restrained layered square/pixel patina with subtle fine scuffs and mottled painted finish; small understated block-shaped variations inspired by a cosy voxel olive dashboard.
Composition/framing: front-on flat texture tile filling the entire square, seamless in both axes, uniform scale and detail distribution across all edges.
Lighting: perfectly even unlit albedo, no shadows, highlights, gradients or baked directional lighting.
Color palette: neutral grayscale only, mostly mid/light gray with very subtle tonal variation and low contrast.
Materials/textures: smooth matte painted surface with slight wear; quiet fine scuffs and restrained tiny squared patches of slightly differing paint tone.
Constraints: no objects, panels, seams, lettering, borders, logos or watermark. No perspective or dimensional relief. Do not depict metal rust, stone, camouflage, fabric, strong scratches or peeling chips. The result must remain a very subtle worn painted surface.
```
