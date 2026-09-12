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

### Accumulated rain/night check at `e050f9f`

At 1000 × 563, Summer/Rain 16:00 (`/tmp/reporoad-cabin-materials-rain-final-20260909.png`) retains distinguishable olive paint and timber with softened top-pad highlights and raised wipers. Summer/Rain 21:00 (`/tmp/reporoad-cabin-materials-night-final-20260909.png`) removes the strong direct highlights; the radio, instrument readout and horn silhouette remain visible. These captures include the revised roof, cloth, glovebox, pad, mirror support, rim and windshield. No obvious material or join regression is visible in these samples. They are not playback/flicker evidence or proof of complete reference fidelity. No product source changed during this check.

### Window crank proportions after `963f97c`

The small crank was close to the screen edge compared with the reference's prominent hand grip. Scaled its five existing pieces 1.4× in the door plane, brought the assembly 0.05 metres inward and 0.025 metres down, preserving depth and the recessed pull below. `/tmp/reporoad-cabin-window-crank-20260909.png` shows the chunkier grip on both doors with no obvious pull collision at 1000 × 563, Summer/Sunny 16:00. Tests, TypeScript and build passed. No new interaction is implied: this remains modeled trim, not an operable window control.

### Whole-cabin comparison at `9cebebe`

Captured `/tmp/reporoad-cabin-whole-comparison-20260909.png`, Summer/Sunny 16:00, 1000 × 563, temporarily hiding crossing/exit overlays; the CSS override was removed immediately afterward. This provides an unobstructed current baseline including the latest mirror mount, windshield, upper rim, material colours and door cranks. Glovebox and radio footprint, foreground cushion corners and upper rim are near the reference positions. Broad layout edits now risk regressing those matches. The remaining visually significant gap is the reference's richer low-angle warm light and material shading. Next compare a later daylight state before adjusting more material colours or moving geometry. The reference's village exterior is deliberately not a target for replacement. Full fidelity and sustained motion stability remain unproven.

### Low-angle cabin lighting after `db6a589`

At Summer/Sunny 17:30, `/tmp/reporoad-cabin-late-light-current-20260909.png` showed warmer but substantially darker cabin regions than the reference. Applied a cabin-only daylight fade `d * (2 - d)`, retaining exact full-day and night endpoints and leaving exterior lighting/time untouched. `/tmp/reporoad-cabin-late-light-lift-20260909.png` shows left cushion mean RGB rising from 84.6/67.3/33.7 to 97.3/76.6/38.8 (reference 124.4/98.1/52.7); passenger pad from 131.7/106.8/65.4 to 144.3/115.5/70.0 (reference 168.8/134.9/81.2); roof from 59.8/35.2/14.3 to 68.6/39.9/16.8 (reference 82.3/49.3/19.6). All move closer but remain darker. The existing transition-continuity test passes unchanged; the half-day expectation now reflects the intentional 0.75 level. All tests, TypeScript and build passed. This is a bounded improvement, not full reference fidelity.

### Moving late-day check at `f76f3ca`

Resumed local preview at Summer/Sunny 17:30. `/tmp/reporoad-cabin-late-motion-a-20260909.png` and `/tmp/reporoad-cabin-late-motion-b-20260909.png` are approximately 32 seconds apart (overlay countdown 0:40 to 0:08). Roadside buildings and rear reflection advance; speed reads 23 km/h. Cabin surfaces and instrument visibility show no obvious regression in these two samples. Sparse screenshots cannot certify intervening frames, GPU completion or flicker-free playback. Added a passing regression test sampling 1,000 daylight levels at three wetness levels: each cabin light is monotonic, bounded by full daylight, continuous within the existing per-step tolerance, and clamps out-of-range daylight at night/noon endpoints.

### Consecutive-frame local capture at `b14ea27`

Temporarily added an app-side canvas.captureStream(30)/MediaRecorder control, activated through the browser UI, and removed all capture code afterward. No live broadcaster or remote service was touched. First transfer was truncated by the inspection response limit (200,011-character returned string ending `[Truncated]`); `/tmp/reporoad-cabin-motion-20260909.webm` is invalid and must not be used. Repeated capture and transferred the 5,539,075-character data URL in verified 100,000-character chunks, saving `/tmp/reporoad-cabin-motion-complete-20260909.webm` (4,154,288 bytes).

The complete VP9 clip decodes 299 frames at 1000 × 563 over 9.930766 seconds without decoding errors. Presentation intervals average 33.32 ms, maximum 40 ms, none over 50 ms. FFmpeg blackdetect (minimum 0.03 s, pixel threshold 0.02) and freezedetect (-50 dB, minimum 0.2 s) report no qualifying events. This is actual consecutive rendered-frame evidence, stronger than CPU submission counts, but only for this ten-second local clip. It does not certify subtle material shimmer, all weather/transitions, the server encoder, audio, or full reference fidelity. Temporary source was removed and the worktree was clean before this documentation entry.

### Stationary-material temporal analysis of the complete clip

Decoded all 299 frames to 8-bit grayscale and compared successive pixels in stationary regions, excluding the mirror, exterior and dynamic displays. Cloth (35,517)–(215,541): mean absolute luma delta 0.024, 95th-percentile frame mean 0.017, maximum frame mean 1.747. Roof (650,5)–(850,26): 0.016 / 0.072 / 0.556. Glovebox (170,444)–(390,460): 0.010 / 0.018 / 0.740. Maximum share of pixels changing by more than eight levels was 0.556% in the cloth and zero in the other regions.

Cloth's three largest changes were at frames 12, 101 and 202. The latter two are VP9 I-frames (verified with ffprobe); the former is a P-frame. Overall patch brightness at those transitions changed by only 0.025–0.050 levels, so these are predominantly spatial redistribution, not brightness flashes. Compression likely contributes, but not every change is attributed conclusively. This bounds visible encoded variation in three sampled regions for ten seconds; it is not a lossless measurement or all-state shimmer certification. The next visual work should target remaining reference material/lighting differences, not add speculative anti-flicker filters based on this clip.

### Upper grip finish after `c15e540`

Rejected an unneeded roof-grain adjustment: the matched roof rectangle already has luma standard deviation 3.17 versus reference 3.09, and 10th/90th percentiles 49.00/57.42 versus 49.65/57.28. Instead addressed the visibly dark upper wheel grip. Rectangle (685,345)–(785,351) previously averaged RGB 25.5/23.1/14.6 against reference 63.1/47.7/34.7. Upper grip material changed from `#514d40` to `#8d7357`, producing 66.5/49.1/31.4 in `/tmp/reporoad-cabin-upper-grip-finish-20260909.png` at Summer/Sunny 16:00. Lower grip, centre pad, silhouette, lights and controls remain unchanged. Tests, TypeScript and build passed. This regional match is not whole-cabin completion evidence.

### Instrument hood contrast after `2255736`

The top hood strip (675,380)–(790,389) averaged RGB 124.3/104.0/60.9 against reference 67.0/54.3/32.3. Darkened only the hood from `#76745a`, first to `#504b36` (88.2/68.5/36.3), then to `#413e31`. Final screenshot `/tmp/reporoad-cabin-instrument-hood-final-20260909.png` retains the projecting edge and separates it from the dark instrument panel. Dimensions, screen, lights and wheel remain unchanged. Updated the existing geometric hood test to locate the part by dimensions/position rather than an incidental paint colour. Tests, TypeScript and build passed.

### Consistent chicken readout at `dd54c5c`

Found a canvas fillStyle leak: the chicken count inherited the final progress tick's colour, making partial/empty/unknown values dimmer than a full crossing. Explicitly set the numeric reading to `#e99b42` and its labels to `#dc984a`, independent of the arc's lit state. Regression tests cover null, zero, partial and full readings without changing their values. `/tmp/reporoad-cabin-count-readability-20260909.png` shows the unknown preview reading and labels with the corrected amber styling. Tests, TypeScript and build passed. Progress indicators still use actual crossing state; no decorative fake data was added.

### Rejected global paint-noise reduction at `1887145`

Compared grayscale variation on the glovebox in the reference and `/tmp/reporoad-cabin-count-readability-20260909.png`. Upper patch (220,405)–(370,417): reference mean/SD 48.96/2.41, current 56.12/20.16. Lower patch (220,449)–(370,459): reference 42.44/9.55, current 38.78/3.76. The mismatch reverses between upper and lower areas, so globally reducing paintedDetail/paintCell strength would not correct both. No shader/source adjustment was made. Investigate the upper face's illumination/bevel/shadow distribution separately before changing the already-tested surface texture; these image statistics alone do not identify the exact cause.

### Glovebox upper-face shading after `4ef1e2b`

Row analysis located the bright strip at y=404–407 in the current face while the reference is already shaded there. A smaller 0.006 bevel did not resolve it (upper patch mean/SD 54.45/20.76); reverted that experiment and retained bevel 0.014. Raised the upper face edge 0.02 metres by changing centre y=-0.545/height=0.22 to y=-0.535/height=0.24, preserving its lower edge, lower trim joint and handle. Side seams follow the new height. This removed the misplaced bright strip (upper mean/SD 43.12/2.75). A small paint correction to `#69654a` yields final upper 47.86/2.85 versus reference 48.96/2.41, and lower 43.52/3.68 versus reference 42.44/9.55. Lower spatial contrast remains less varied; no global texture adjustment was made. Final screenshot `/tmp/reporoad-cabin-glovebox-shading-final-20260909.png`. Tests, TypeScript and build passed, including lower joint and fixed-handle assertions.

### Glovebox lower trim alignment after `a4f23e4`

The remaining lower-patch variance was a horizontal boundary, not missing texture: reference mean luma drops from about 50 at row 453 to 31 at row 455, whereas the old face stayed around 43 until row 467. Preserved the fitted upper edge at -0.415 and handle, but raised the lower face edge to -0.61 (centre -0.5125, height 0.195). Raised and widened the joined trim (height 0.045), shifted its shadow seam, and extended the lower panel upward while preserving its bottom at -0.98. The measured boundary now occurs at row 455. Lightened the trim to `#55563d` after the first capture showed it too dark. Final `/tmp/reporoad-cabin-glovebox-lower-trim-final-20260909.png`. Tests, TypeScript and build passed; joint and handle assertions remain in place. No texture-noise change was needed.

### Lower-panel / footwell separation after `1d47597`

Reference (180,480)–(380,495) mean RGB 27.2/23.1/9.1 versus current 12.4/11.5/5.4. Lightening the entire lower panel overshot the footwell: (300,520)–(380,550) rose to 35.5/32.4/14.7 versus reference 14.8/13.3/5.9. Replaced that uniform treatment with two edge-joined sections: short upper `#505035` from y=-0.673 to -0.735 and original dark `#34362a` below to -0.98. The first split at -0.8 extended the light panel too low and was rejected. Final `/tmp/reporoad-cabin-lower-panel-verified-20260909.png` retains dark depth below the readable olive strip. Added an exact edge-join assertion; outer bounds and handle remain unchanged. Tests, TypeScript and build passed.
# Right-seat cloth balance — 2026-09-09

Matched 1000×563 Summer/Sunny 16:00 preview against the cosy reference.
The left cushion patch (35,517–215,541) was already close: RGB
126.3/101.0/53.1 versus 124.4/98.1/52.7. Kept its material defaults.
The right patch (850,526–970,547) was too dark: 113.4/90.4/46.1
versus 135.2/106.7/60.3. Added independent fabric base/yarn gains,
using 0.64/0.60 for the right seat only (defaults remain 0.42/1.05).
Final patch is 136.6/111.3/60.1. Luminance variation remains higher
than the reference (39.4 versus 33.4), so this is a brightness improvement,
not proof of full cloth or cabin fidelity. Geometry, controls and radio
are unchanged. Final screenshot: `/tmp/reporoad-right-seat-final.png`.
All 31 test files, TypeScript checking and production build passed.
# Horn-pad layering — 2026-09-09

Compared `/tmp/reporoad-right-seat-final.png` and the reference at 1000×563.
The outer horn pad was visibly broader than the reference while its centre
and vertical outer bounds were already close. Reduced pad/trim horizontal
scale from 1.04 to 0.84, retaining the rim, emblem and column dimensions.
Shortened the inset face and its surrounding stepped trim to 82% height,
centred on the existing face, exposing more of the outer padded surround.
Final visual check: `/tmp/reporoad-horn-pad-layered.png`. The emblem and
instruments remain in place. Geometry tests cover fixed outer height, new
width, shorter inset, column depth separation and seat clearance. This is
a local silhouette improvement; overall lighting/material fidelity remains
incomplete and no live deployment was made.
# Radio surround — 2026-09-09

The 450,414–550,420 upper surround patch measured RGB 66.8/40.3/19.5
against reference 38.4/26.2/13.3. Adjusted only the upper wooden radio
housing from #6b5035 through #4f3e2b to #403323. The switch-bank wood,
radio texture, physical controls and geometry are unchanged. Screenshot:
`/tmp/reporoad-radio-surround-final.png`. Matched local Summer/Sunny
16:00 preview; no claim that this single region establishes overall fidelity.
# Post-refinement rain/night check — 2026-09-09

Verified current commit cab0947 in the local browser at 1000×563, Summer,
paused car, with Rain at 16:00 and 21:00. Saved screenshots:
`/tmp/reporoad-cabin-refinements-rain.png` and
`/tmp/reporoad-cabin-refinements-night.png`.
The darker radio surround retains separation from the display and switch
bank in both states. The shorter inset horn face remains distinguishable
from its outer pad. Amber music and instrument displays remain visible;
the changing track title and spectrum continue rendering while the car is
paused. No compensating light increase is warranted from these views.
These are still-frame material/readability checks, not a renewed motion,
audio, server or comprehensive flicker test. Neither is a reference-matched
night image available, so this does not prove overall reference fidelity.
Next comparison should address surface detail rather than undoing the
recent darker trim with additional fill lighting.
# Door substrate material — 2026-09-09

The broad brown door substrate at [±(doorX+0.05), -0.67, -1.45]
was still routed through the painted material despite the reference's wood
door treatment. Enabled the existing wood treatment for these two blocks
only. Olive upper caps, panel rails, hardware, geometry and exterior remain
unchanged. Checked the matched 1000×563 daylight rendering in
`/tmp/reporoad-door-wood.png`: this is a subtle surface correction because
much of each substrate is outside the camera view or behind the rails.
Tests, TypeScript and production build passed. This does not resolve the
remaining whole-cabin fidelity gap.
# Upholstery weave scale — 2026-09-09

Reduced the oversized woven dashes by raising object-space stitch density
from 19×25 to 27×35. Fixed irregular row starts and yarn selection remain;
seat shapes and material base/yarn gains are unchanged. Matched screenshot:
`/tmp/reporoad-seat-weave-finer.png`.
Left patch RGB now 122.2/97.5/50.6 vs reference 124.4/98.1/52.7;
right 135.6/110.2/59.2 vs 135.2/106.7/60.3. Luminance SD is
22.8/38.5 versus reference 27.4/33.4: pattern scale improves visibly,
but contrast is not identical and this still frame does not prove temporal
stability of the finer pattern. Existing motion audit predates this change.
All 31 test files, type checking and production build passed.
# Finer-weave moving spot check — 2026-09-09

Resumed the local drive at fixed Summer/Sunny 16:00 and 1000×563.
Two screenshots, `/tmp/reporoad-weave-moving-a.png` and
`/tmp/reporoad-weave-moving-b.png`, show different roadside positions and
23 km/h. Cloth texture features remain aligned: left/right luminance
correlation 0.989/0.974; spatial-gradient correlations 0.984–0.993 and
0.980–0.982. Brightness changes between sampled views (especially right
seat) mean they are not identical frames; lighting is a plausible contributor,
not proven as the sole cause. Glovebox sample is unchanged.
No obvious texture displacement or wheel/seat collision in these sampled
views. This is explicitly not a consecutive-frame flicker test, and cannot
replace the prior video audit with one covering the new weave. No smoothing
or compensating material changes made from this limited evidence.
# Rejected long-grip bevel experiment — 2026-09-09

Tested 9 mm instead of the default 5 mm bevel on joined wheel rim spans
of at least four cells, preserving short steps and all bounds. The matched
1000×563 screenshot `/tmp/reporoad-wheel-grip-bevel.png` did not establish
a convincing reference-fidelity improvement at normal viewing size. Reverted
the experiment in full; no wheel source change remains. Tests/build passed
for the experiment, but passing checks were not treated as visual evidence.
Avoid further grip-bevel tuning without a more specific visible mismatch.
# Hub horizontal alignment — 2026-09-09

The matched image placed the badge around x766 versus roughly x754 in
the reference. Shifted the pad, layered face, badge and column cover left
by 0.026 model units; rim and zero-depth spokes remain fixed. Final image
`/tmp/reporoad-hub-alignment.png` places the badge around x757. These
are approximate visual landmark readings, not a full image registration.
Outer pad height, inset proportions and instrument layout are unchanged.
Updated the centre-position geometry assertion; the full test suite,
TypeScript check and production build pass, including seat clearance.
# Neutral horn inset finish — 2026-09-09

At fixed daylight/framing, two inset-face patches were too yellow-brown:
RGB 55.8/43.1/27.2 and 54.8/44.2/28.0 against reference
56.6/44.3/34.5 and 60.0/47.3/36.8. Changed inset and side-face
colour #827056 to #857363, preserving outer padding, edging, badge and
geometry. Final patches: 57.7/44.9/32.5 and 57.5/46.3/34.6.
Screenshot `/tmp/reporoad-hub-neutral-finish.png`. Both measured patches
are closer; this does not establish whole-cabin or all-lighting fidelity.
Full tests, type check and build passed.
# Right-seat within-patch contrast — 2026-09-09

Subregion checks revealed the prior broad average concealed spatial
differences: top cloth luma 153.4 versus reference 114.1, and middle
weave standard deviation 12.1 versus 36.9 despite almost equal means.
Right-seat-only base/yarn gains changed from 0.64/0.6 to 0.55/1.5
after rejecting a too-dark 0.5 base. Left seat and geometry unchanged.
Final screenshot `/tmp/reporoad-right-weave-balanced.png` shows stronger
yarn contrast rather than uniformly bright cloth. Regional shading still
differs; this is not proof of exact upholstery reproduction. Full suite
passed at the 0.5 experiment; final 0.55 adjustment type-checks/builds.
# Lower-console timber lip — 2026-09-09

The recess patch already nearly matched the reference (RGB15.0/14.3/5.6
vs17.2/14.9/7.7), but the timber above it was too dark/red
(32.0/17.8/7.4 vs49.9/36.1/15.9). #78684b brought the timber to
51.1/33.8/16.7, but brightened the side borders excessively. Split the
original 0.23-high panel into a 0.038 upper lip and 0.192 lower panel,
joined exactly at y=-0.983 before the existing console transformation.
The lower panel retains #59442e; recess and controls are unchanged.
Final visual check `/tmp/reporoad-lower-console-lip.png`. Tests, type
check and build passed. Exact lighting/texture equivalence remains unproven.
# Whole-cabin checkpoint and panel regression — 2026-09-09

Reviewed the original reference and `/tmp/reporoad-lower-console-lip.png`
together at equal dimensions. Preserve the current windshield/mirror,
glovebox, radio, wheel and seat layout as the next lighting/material baseline.
Do not infer full completion from individual matched patches: the cabin's
overall light distribution and surface variation still differ. Repository
exterior and real instrument contents intentionally differ and must remain.
Added a regression check proving the two lower timber pieces meet exactly
and preserve the original top, bottom, width and depth after transformation.
Full suite passed. No further broad geometry adjustment justified by this
checkpoint; focus subsequent evidence on lighting and texture distribution.
# Upper grip face depth — 2026-09-09

Row comparison x695–780 showed reference grip face through y354–357,
but current face ended around y351 before revealing the bright background.
Extended only the topmost horizontal grip downward 0.022 units, keeping
its top bound fixed. Final `/tmp/reporoad-upper-grip-depth.png` has face
RGB65/47/31 at y354 versus reference66/50/37 (previous73/63/36,
then rapidly brighter). Rows345–354 now remain consistent grip material.
The bright strip below y360 is still unlike the reference's dark underside;
do not conflate that remaining region with grip-face thickness or claim it
resolved. Existing stepped coverage, fixed crown and seat-clearance tests
pass; added explicit crown-thickness assertion. Build/type check passed.
# Rejected rearward grip-depth experiment — 2026-09-09

Extended the upper grip rearward from 0.085 to 0.155 depth with its
front face fixed. The y360 strip changed RGB114/92/55 to93/68/39,
but y363 remained137/106/63 versus reference23/18/7. Thus extra grip
depth does not solve the dominant mismatch. Reverted depth and associated
test-selector changes; retained the previously verified downward 0.022
grip-face extension. Experiment screenshot:
`/tmp/reporoad-upper-grip-underside.png`. Do not keep enlarging the grip
to cover unrelated background pixels. All checks passed during experiment.
# Dashboard top highlight — 2026-09-09

Changed only the continuous pad colour #c3ad7c to #efd196. At
160,391–385,403 its RGB moved from125.9/104.5/63.1 to140.3/118.6/75.6,
closer to reference161.3/129.5/78.3. Shaded glovebox sample remained
49.6/43.0/23.8, effectively unchanged. Screenshot:
`/tmp/reporoad-dashboard-top-light.png`. Whole-view inspection retained
the warm highlight/shaded fascia separation. Remaining highlight deficit
should be investigated as light distribution, not solved by indefinitely
raising albedo toward white. Tests/type check/build passed; no world light
or geometry was changed.
# Pad recess tint — 2026-09-09

The moulded passenger inset used vertex RGB multipliers0.32/0.40/0.58,
in addition to actual recess shading. Softened these to0.60/0.64/0.72,
preserving the six-millimetre recess, normals, topology and radio inset.
Final `/tmp/reporoad-pad-recess-tint.png` retains a visible formed panel.
Large top sample improved modestly from140.3/118.6/75.6 to143.4/121.0/76.7,
still below reference161.3/129.5/78.3. Thus baked tint contributed but
was not the sole source of the highlight deficit. Updated colour assertions;
closed-edge/recess geometry checks remain unchanged. Full tests, type check
and build pass. No extra lights or exterior changes.
