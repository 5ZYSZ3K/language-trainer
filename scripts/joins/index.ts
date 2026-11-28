import { czechAdjectivesWithNouns } from './adjective-noun-declension'
import type { Join } from './join'

export type { Join, JoinInputs, JoinResult } from './join'

/** The joined datasets, each with how to make it again. check-data runs every one. To add one: write its join and add it here. */
export const JOINS: readonly Join[] = [czechAdjectivesWithNouns]
