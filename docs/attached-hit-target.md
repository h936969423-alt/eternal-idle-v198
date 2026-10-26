# Prevent attached attacks from crossing to another victim

Reproduced using the actual normalWeaponAttack, applyDollAttack, damageMonster
and syncTarget function bodies with deterministic combat inputs and an award
adapter that advances selection as the real award() does. The previous normal
attack passed no locked target to doll effects unless it was triple arrow.
After a main/weapon/doll hit killed A, award() selected B; unfinished attached
doll effects then damaged B, and another effect could damage C in the same swing.

All normal swings now pass their original encounter to attached weapon and doll
handlers. The existing locked-target checks end the attached chain if that
encounter dies or is replaced. The next independently scheduled normal attack
may use the next target. Explicit all-target weapon magic still keeps its AoE;
the existing triple-arrow single-target restriction remains. Damage rolls,
proc chances, rewards and independent pet/summon timers are unchanged.

Secondary damage captions identify doll, pet, summon, poison, weapon, counter or
skill results. Ordinary player damage remains unlabelled. This makes legitimate
multi-target effects visible instead of presenting all numbers as normal swings.
The local presentation timeout also requires an actual same-UID swing; an active
owner with no swing cannot flush multiple monsters' delayed results together.

normal-attack-target.test.mjs reproduces the prior failure and verifies lethal
main hits, a lethal first doll effect, lethal single-target weapon magic, later
independent swings, retained AoE, triple-arrow restrictions and source captions.
