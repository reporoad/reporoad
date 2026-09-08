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

### Rejected broad paint-normal relief at `5e5ba7b`

Tested 2 mm broad, object-fixed noise relief at 16 × 24 × 16 cells/metre, filtered with the existing paint footprint and excluded from timber/fabric. Screenshot: `/tmp/reporoad-cabin-paint-relief-20260909.png`. At 1000 × 563 this did not visibly close the reference gap; the glovebox still read as a broad flat panel. Reverted the shader and cache-key changes completely. Do not repeat small normal-amplitude adjustments as the next material pass. Inspect actual silhouette/bevel variation and panel edge geometry instead, with a before/after showing a clearly perceptible improvement.

### Unobstructed whole-cabin audit at `4611eae`

Captured `/tmp/reporoad-cabin-full-audit-20260909.png` at 1000 × 563, Summer/Sunny 16:00, with broadcast overlays temporarily hidden. Both temporary CSS declarations were removed immediately after capture; production controls are unchanged.

- Roof opening, mirror frame, glovebox, seat framing and wheel silhouette are substantially aligned with the reference. Do not make further layout moves without measured before/after evidence; small arbitrary changes risk reversing the accumulated fit.
- The current warmer/taller centre pad and smaller pillar sections are included. Radio and speed content remain real, and the repository exterior intentionally differs from the reference village.
- Material richness remains weaker than the reference, particularly the warm wood/paint separation under window light. Shader micro-noise has already failed to improve this at delivered resolution.
- Instrument composition is still sparser than the reference. Preserve meaningful speed, traffic-light and chicken data if revising its grouping; do not fill space with fake mechanical gauges or unreadable labels.
- Completion remains unproven: almost-identical material/lighting fidelity and sustained frame-by-frame rendering stability are still open. This paused comparison is not evidence for either gate.

### Weather-state check at `dc6799a`

- 1000 × 563 Summer/Rain 16:00: `/tmp/reporoad-cabin-updated-rain-20260909.png`. Diffuse cabin lighting retains the timber/paint distinction; the wipers are visibly raised mid-sweep. Instrument text and the new crossing arc remain visible.
- Summer/Sunny 21:00: `/tmp/reporoad-cabin-updated-night-20260909.png`. Direct sunlight is absent; radio/instrument illumination and the wheel-pad outline remain visible. The broader canopy transmission has not left sunny patches at night.
- These samples cover the accumulated wheel, material, instrument and window-light changes. They show no obvious missing surfaces or weather-state visual regression, but are neither a sustained playback test nor proof of almost-identical daylight fidelity. No application source changed during this check.

### Measured local submissions at `610e205`

Temporarily displayed the existing post-composer submission counter in the local browser, sampling every five seconds. Moving Summer/Sunny 16:00, 1000 × 563, mirror at its revised 20 Hz target. Screenshot `/tmp/reporoad-cabin-measured-render-20260909.png` records consecutive samples: 8.6, 60.0, 58.6, 58.4, 60.0, 59.8 submissions/s. The first interval included the broadcast-view/resize startup transition; subsequent five intervals cover approximately 25 seconds of steady movement. The temporary readout was completely removed afterward.

This proves successful CPU-side scene submissions near 60/s during this bounded local sample, not GPU completion, lack of pixel flicker, encoder throughput, or VPS performance. Startup behavior is not certified by excluding its low sample. The sustained production and almost-identical visual-fidelity gates remain open.

### Region-measured cloth contrast after `3a541ab`

Compared the same left-cushion rectangle (x=35–214, y=517–540) at 1000 × 563. Reference mean RGB was 124.4/98.1/52.7 with luma standard deviation 27.4. Before adjustment (`/tmp/reporoad-cabin-upper-seal-20260909.png`) it was 162.1/135.1/76.9 and 20.2: too bright and too low-contrast. Lowered the fabric shader's base from 0.74 to 0.42 and increased yarn gain from 0.85 to 1.05, leaving its geometry and mapping fixed. New capture `/tmp/reporoad-cabin-cloth-contrast-20260909.png` measures 126.2/101.0/53.0 and 27.0. Visual inspection retains the woven highlights against a darker field.

These are sRGB image-region measurements, not calibrated material properties or proof of whole-cabin identity. Other diagnostic rectangles indicated the roof panel is darker than the reference and parts of the lower console brighter; inspect those independently rather than applying another global lighting increase.

### Lower console recess after `2b9c46c`

Raised the existing dark footwell inset from model y=-1.04 to -0.96 and increased its height from 0.075 to 0.15. At 1000 × 563 it now begins immediately below the switch panel, reducing the bright lower timber area to better match the reference's dark pocket. An intermediate y=-0.99/height=0.12 remained too low. Final screenshot: `/tmp/reporoad-cabin-console-recess-final-20260909.png`. Radio, switches, wheel and lighting are unchanged. All 31 test-file entries, TypeScript and production build passed. This paused geometry comparison does not establish motion stability or whole-scene identity.

### Region-measured roof colour after `fe32e12`

Roof rectangle x=650–849, y=5–25: reference mean RGB 82.3/49.3/19.6; previous 54.5/32.6/14.3. First material adjustment overshot to 104.4/64.2/29.2 and was reduced. Final outer timber `#7b5e38` and centre `#675b3a` produce 82.0/48.2/20.6 in `/tmp/reporoad-cabin-roof-measured-final-20260909.png`. Geometry, dark retaining straps, seals and all light intensities are unchanged. The numerical match is local evidence for this roof region, not proof of every roof pixel or lighting state.

### Glovebox olive after `a7b58f9`

Changed only the glovebox face paint from `#77745a` to `#625f45`. At the same paused Summer/Sunny 16:00, 1000 × 563 framing, upper rectangle (200,406)–(380,424) mean RGB changed from 75.0/66.4/40.8 to 56.3/48.3/26.8 against reference 56.4/48.7/26.3. Lower rectangle (165,444)–(380,460) changed from 60.8/54.1/32.9 to 43.6/37.9/20.2 against reference 51.0/43.6/22.2: slightly too dark, but lower total channel error than before. Keep this local improvement; do not infer identical lighting from regional means. Screenshot `/tmp/reporoad-cabin-glovebox-olive-20260909.png` retains handle and bevel contrast. Geometry, exterior, real instruments and global lighting are untouched. All 31 test-file entries, TypeScript and production build passed.

### Upper rim silhouette after `b1d319f`

The upper steering rim remained approximately 12 pixels below the reference at matched 1000 × 563 framing. Increased only its positive-y mapping from 1.07 to 1.17. An initial 1.25 experiment overshot (roughly y=330); the final top is roughly y=340, close to the reference. Final capture `/tmp/reporoad-cabin-upper-rim-final-20260909.png`; initial rejected capture `/tmp/reporoad-cabin-upper-rim-20260909.png`. Horn, spokes, lower bowl, wheel placement and instruments are unchanged. Updated stepped-cell coverage and upper-bound expectations; the suite also checks seat clearance and fixed horn position. This improves the upper silhouette only, not proof of overall identity or motion stability.

### Mirror mounting after `23ff0db`

Narrowed the central mirror stem from 0.13 to 0.08 metres and its upper fastening plate from 0.15 × 0.13 to 0.095 × 0.10 metres. The reference's visible central support is about 21 pixels wide; the previous mounting was about 35 pixels. `/tmp/reporoad-cabin-mirror-support-20260909.png` shows the revised slim support at the same 1000 × 563 framing. Mirror glass, frame position, camera, target and refresh scheduling are unchanged. This is a mounting-proportion improvement, not a change to the reflected view or a motion verification.

### Windshield opening after `b6f4c79`

Increased the aspect-dependent pillar position factor from 1.19 to 1.25, bringing the inner glass boundaries from about x=84/916 toward x=60/940 at 1000 × 563, closer to the supplied reference. Initial trial also displaced the doors: rejected that coupling. Door panels, rails and window hardware now retain the original 1.19 placement through a separate optional model argument, while roof joins and seals follow the wider pillars. Final screenshot `/tmp/reporoad-cabin-windshield-width-final-20260909.png` shows restored hardware. All source tests, TypeScript and build passed; an additional regression test verifies fixed door rails under a wider surround. Dashboard, seats, wheel, reflection and repository exterior are unchanged. Other aspect ratios still require visual checking.

### Responsive framing after `cb37de6`

1000 × 750 broadcast capture `/tmp/reporoad-cabin-windshield-4x3-20260909.png` shows joined pillar/roof geometry, but the fixed vertical field of view crops the right wheel edge. The regular 390 × 844 page had the same issue because its mobile drive surface explicitly used 4:3 (`/tmp/reporoad-cabin-phone-20260909.png`). Changed that CSS surface to 16:9; `/tmp/reporoad-cabin-phone-wide-20260909.png` now retains both seat corners and the wheel composition. Production build passed. Arbitrary non-landscape full-screen broadcast composition remains outside this fix; do not claim it is verified against the landscape reference.

### Upper dashboard warmth after `28daefb`

Measured rather than following the initial impression that the pad was too bright. Passenger top region (180,387)–(380,400) reference RGB 168.8/134.9/81.2 versus previous 129.5/114.6/71.1; centre (445,388)–(560,400) reference 186.0/146.1/85.1 versus previous 150.3/128.2/76.9. Changing only the pad base colour from `#a19a72` to `#c3ad7c` yields 159.0/132.0/83.6 and 163.5/136.4/84.4 respectively in `/tmp/reporoad-cabin-pad-warmth-20260909.png`. Both regions are closer, although centre brightness remains short. Seams, vertex wear, lighting and exterior remain untouched. Tests, TypeScript and build passed. Regional means do not prove identical shading or material response in other weather states.
