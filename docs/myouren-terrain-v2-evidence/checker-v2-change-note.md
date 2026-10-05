The exact V1 execution is retained at `v1-source/tools/check-myouren-terrain.mjs`, SHA256 `46308277039638a21e2940faa615025ed292a43b3e6659b1b154de8d32bb42dc`. Its original `independent-v1.json` / CLI1 remains 9/12. It is not rewritten as a pass.

The next checker selects six original root footprints from the actual decoded public/native plant prototypes and instance matrices. V1 mistakenly compared a root base Y to matrix translation Y for instance17: the actual matrix translation is 88.28887176513672, while the conservative merged prototype base is 88.26381341854308. Separate source-bound diagnosis preserved in `v1-diagnostics.json` sampled all 102 footprint points: no missing faces, original near error <=1.4e-14m, far-to-near error <=0.000932345m.

For the unchanged central near stair band only, the cut trace now compares candidate minus the same baseline trace difference. The V1 diagnosis established an existing maximum normal/cut difference 0.07597732543945312m and exactly zero introduced difference. The 0.001m tolerance is unchanged. Modified wings and far surfaces must still have coincident normal/cut trace within that tolerance; the authorized far rebuild may fix original coarse-surface error.

The real missing-ground assertion remains strict: the original 25 far-cut samples outside the inspection hole at x194/196/200/204/206 and z380/382/390/405/414 require candidate coverage. V1 fails this assertion. No automatic fallback, fixture update, or tolerance relaxation was added.

Node22 and optional explicit `--source-sha` guards bind the next run; the checker also verifies the source remained unchanged during execution. No revised checker has been executed yet. It will run only after Astra freezes the actual V2 source.

V2 also gets two assertions for its changed design: planned rock facet interiors must be present in the actual indexed near surface with hard, unit face normals; actual soil/rock ring edges must have exactly one soil and one rock use sharing exact Float32 positions. These read the resulting source arrays. The source declaration that two surfaces connect is not accepted as proof. These checks have only passed syntax parsing so far.
