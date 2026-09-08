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

### Accumulated material check at `6224582`

- Same-size local Summer/Sunny 17:30 preview: `/tmp/reporoad-cabin-golden-audit-20260909.png`; 16:00 comparison: `/tmp/reporoad-cabin-badge-fit-20260909.png`.
- Includes the reduced sunny front fill, shallower glovebox, central pad inset, straw yarn tint and wider horn emblem. The top edge and handle of the glovebox remain fixed, and its lower edge now sits close to the reference. Instruments are readable in both snapshots.
- Low sun changes the seat and dashboard illumination but does not supply the reference's material richness. Do not treat another global warmth or fill adjustment as the default next step. Compare broad surface variation and edge treatment at delivered size instead; avoid repeating rejected fine-scuff work.
- These are paused visual checks, not evidence of uninterrupted motion or stream reliability. Overall fidelity remains incomplete, especially material richness. No application source changes in this check.

### Moving cabin check at `e7f1fe7`

- Local Summer/Sunny 16:00 driving preview, 1000 × 563: `/tmp/reporoad-cabin-motion-a-20260909.png` and `/tmp/reporoad-cabin-motion-b-20260909.png`, captured about 14 seconds apart.
- Roadside buildings and mirror advance; speed reads 23 km/h; audio bars differ between captures. Paint patches remain attached to the cabin, the seal assemblies remain present, and the revised right-seat framing leaves the wheel clear.
- No missing cabin surfaces or black frames were observed in these samples. Two screenshots cannot establish frame-to-frame freedom from flicker or long-running livestream stability. Those gates remain open, as does the overall reference-fidelity goal.

### Rejected intermediate speed labels at `1e3d77c`

Tested 10/20 km/h labels aligned with the existing gauge arc. At 1000 × 563 they were too small to read and did not materially improve fidelity (`/tmp/reporoad-cabin-speed-scale-20260909.png`). Removed the experiment. Keep the larger live speed reading and avoid adding miniature typography as a substitute for the reference's broader instrument composition.

### Whole-cabin comparison at `de0c476`

Compared `/tmp/codex-clipboard-22RtXd.png` directly with `/tmp/reporoad-cabin-grouped-paint-20260909.png`, both 1000 × 563. The latter is the current branch's sunny local preview; its broadcast labels cover part of the roof.

| Requirement | Current evidence and remaining gap |
| --- | --- |
| Proportions | Glovebox height, mirror frame, wheel/horn height, right-seat placement and parked wipers are closer. Avoid further arbitrary moves without a specific silhouette discrepancy. |
| Materials | Olive paint has connected block wear and wood/rubber are separated. The reference still has richer surface and edge variation; not proven almost identical. |
| Trim | Stepped pillar covers and inset seals are present; housing and window boundaries remain intact. Roof is partly obscured by the broadcast overlay in this capture. |
| Seats | Olive/straw colours and foreground softness are closer. Repeated fleck rows remain more regular than the reference: this is the next focused material target. |
| Instruments | Live radio/audio bands, speed and shared-state displays are retained. Their meaningful content deliberately differs from the reference's fictitious radio/time text. |
| Lighting/stability | All cabin lights now sample the shared clock continuously. Short moving and rain checks exist; no sustained frame-by-frame flicker or livestream proof. |
| Repository exterior | Repository buildings and name-only signs are retained. The reference village is not being substituted for the requested repository world. |

Overall goal remains incomplete. This audit is a prioritization result, not a completion claim or a reason to repeat tiny palette adjustments.

### Accumulated moving check at `e3775c9`

- Summer/Sunny 16:00 local preview, 1000 × 563, with the revised yarn, reduced seat blur, larger radio type, stronger direct window light, wider/right-shifted wheel and backlit speed scale.
- Captures `/tmp/reporoad-cabin-motion-updated-a-20260909.png` and `/tmp/reporoad-cabin-motion-updated-b-20260909.png` show different repository positions and mirror contents, both at 23 km/h. The wider rim remains behind the seat without an intersecting edge. The radio spectrum differs between samples.
- No missing cabin surface or black frame appears in these samples. They do not establish frame-by-frame stability or live-stream reliability.
- Comparing the accumulated cabin against the original reference, the main remaining material discrepancy is the broad glovebox/trim surface: its large smooth regions still read more like plain game geometry than the reference's irregular voxel relief. Further uniform warmth, tiny typography, or arbitrary wheel moves are not the next priority. Investigate surface-scale relief and its grazing-light response while preserving fitted boundaries and instrument visibility.
- This check adds runtime evidence but does not prove the almost-identical goal complete. No application code changed during this check.
