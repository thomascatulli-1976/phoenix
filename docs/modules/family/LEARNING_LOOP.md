# Phoenix Family Learning Loop v0.1

## Purpose

The learning loop improves later meal recommendations from explicit household feedback without silently changing strict dietary or safety constraints.

## Accepted feedback

- liked
- accepted
- tolerated
- disliked
- refused
- not tolerated
- leftover

## Rules

1. Only feedback with granted consent contributes to learning.
2. Strict dietary constraints always override learned popularity.
3. A not-tolerated signal has the strongest negative weight.
4. Guardian-recorded child feedback remains guardian-governed.
5. Learning scores influence ranking but do not authorize purchases, messages, calendar changes, or device actions.
6. Every signal retains member ownership, provenance, visibility, timestamp, and confidence.
7. Users must be able to correct or revoke feedback and consent in later persistence layers.

## Current deterministic weights

| Signal | Weight |
|---|---:|
| liked | 4 |
| accepted | 2 |
| tolerated | 3 |
| disliked | -3 |
| refused | -5 |
| not tolerated | -8 |
| leftover | -1 |

These initial values are product defaults, not medical or nutritional judgments.

## Demo outcome

The demo family records positive feedback for the mild vegetable soup, with a small leftover penalty for one member. The recipe is consequently ranked above an alternative with no positive history, while all original dietary constraints remain active.
