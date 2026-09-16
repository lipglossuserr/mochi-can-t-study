package com.mochi.mochibackend.community.enums;

/**
 * Why a piece of content was reported. A short, fixed list rather than
 * free text — per the design doc's "resist scope creep" instinct, this
 * gives moderators enough to triage a queue at a glance without
 * building a taxonomy. {@code note} on {@code Report} carries anything
 * more specific, especially for OTHER.
 */
public enum ReportReason {
    SPAM,
    HARASSMENT,
    OFF_TOPIC,
    OTHER
}
