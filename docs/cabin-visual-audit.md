# Cabin comparison checkpoint

Source checkpoint: `479564a` on `codex/cosy-driving-polish`.
This is an incomplete visual audit, not a claim of reference fidelity.

## Evidence

- Reference: `/tmp/codex-clipboard-22RtXd.png` (1000 × 563).
- Current sunny 16:00 capture: `/tmp/reporoad-cabin-horn-width-20260908.png`.
- Current sunny 17:30 capture: `/tmp/reporoad-cabin-late-afternoon-20260908.png`.
- Both current captures use the same paused support-preview scene and 1000 × 563 viewport.
- The reference exterior is intentionally not reproduced: the repository world and name-only labels must remain.
- Preview instruments show local/parked state, not the live stream state. Compare their active appearance separately.

## Findings and priorities

1. **Lighting is the largest remaining gap.** Reference sunlight is warm, low and directional. Current cabin light is more uniform. Changing the local preview from 16:00 to 17:30 changes exterior shadows, but does not meaningfully reproduce the reference cabin lighting. `VoxelCabin` uses a fixed spotlight position and colour; `cabinLighting` takes daylight and wetness but not sun direction. Next investigate bounded sun-responsive cabin key position/colour, preserving night and overcast behaviour. Do not keep compensating with arbitrary paint recolouring.
2. **Materials remain simpler than the reference.** Paint and upholstery now have surface-attached detail, bevels and restrained variation. They still lack the reference's fine, coherent light/shadow detail. Reassess after the directional-light work before changing textures again.
3. **Framing is comparatively close.** Mirror, radio, glovebox and foreground seats occupy similar regions. The wider horn pad is closer to the rectangular reference. Avoid moving these assemblies without a new same-size comparison showing a specific mismatch.
4. **Instruments must remain truthful.** The reference's decorative readings are not a reason to replace actual speed, traffic status, crossing count, track title or measured audio levels. The new journey ladder has unit coverage but its populated live appearance still needs browser inspection.
5. **Stability remains a separate gate.** Passing geometry tests and production builds does not prove visual fidelity or long-running flicker-free output. Verify stationary and moving views, weather transitions and active instruments after the next lighting change.

## Preserve

Non-main branch; local-only work; existing radio/dashboard functionality; seat/wheel clearance; repository exterior; shared clocks and music; no live broadcaster restart or deployment.

## Sun-responsive key follow-up

The cabin key now uses `cabinSunlight` for a bounded position following the shared solar arc, plus clear-weather low-sun warmth. Other fill lights and the exterior are unchanged. Unit tests cover morning/evening direction, bounded continuous movement, and suppression of extra warmth at night and in overcast weather. Browser comparisons are saved at `/tmp/reporoad-cabin-solar-16-20260908.png` and `/tmp/reporoad-cabin-solar-1730-20260908.png`. The latter shows changed illumination across the upper pad and seat surfaces. Full morning/night/weather visual checks and long-running stability checks remain outstanding; this does not close the fidelity goal.

### Additional browser checks at `0643742`

- 08:00 sunny: `/tmp/reporoad-cabin-solar-morning-20260908.png`. Opposite-side light is visible on the passenger pad, with readable instruments.
- 21:00 sunny: `/tmp/reporoad-cabin-solar-night-20260908.png`. Daylight highlights are absent; amber instruments and cabin outlines remain visible.
- 16:00 rain: `/tmp/reporoad-cabin-solar-rain-20260908.png`. Directional highlights are subdued and the controls remain readable.
- These are paused local preview snapshots, not long-running animation or livestream validation. They close the basic morning/night/rain snapshot checks only. Snow, continuous transitions, moving shadow stability and populated live instruments remain unverified.
- Restored 16:00 sunny and the normal viewport after checking. No runtime code changes in this validation pass.

### Moving weather checks at `0d41d2f`

- Winter/snow while driving: `/tmp/reporoad-cabin-snow-drive-20260908.png`. The mirror reflects the winter world, speed reads 23 km/h, and cabin materials remain legible under diffuse light.
- Summer/rain while driving: `/tmp/reporoad-cabin-rain-wipers-a-20260908.png` and `/tmp/reporoad-cabin-rain-wipers-b-20260908.png`. Road and mirror advance, wipers are raised into their sweep, and radio/speed displays remain visible.
- Short screenshot observations did not expose missing cabin meshes or black frames. They do not establish flicker-free frame-to-frame playback or sustained stream stability.
- Restored paused Summer/Sunny 16:00 and normal viewport. No runtime source changed in this pass.

### Rejected painted-scuff experiment

At `1b06e88`, tested sparse surface-attached short scuffs with derivative filtering, maximum 8% darkening and an 18% cell occupancy. Capture: `/tmp/reporoad-cabin-paint-scuffs-20260908.png`. At 1000 × 563 the difference was not a meaningful improvement toward the reference. Removed the shader experiment completely. Do not repeat fine-scuff micro-tuning without a larger-scale material discrepancy and a visibly better comparison; broad lighting and material response matter more at the delivered camera distance.
