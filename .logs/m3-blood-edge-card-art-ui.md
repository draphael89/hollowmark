# M3 Blood Edge Card Art UI

Goal: use the first approved card-art asset in gameplay without making the
whole hand depend on generated art.

## Changed

- S0/M1 combat now loads `card.blood-edge.placeholder` through the asset
  manifest only because it is `approved-for-gameplay`.
- Blood Edge gets a small hand-card art accent and a larger selected-card image.
- Other cards remain text-only.
- Debug state exposes the approved card-art id/path/gate while enemy sprite art
  remains `null`.

## Boundary

This wires only the approved Blood Edge card art. It does not introduce a card
art system for every card or use unapproved sprite art.
