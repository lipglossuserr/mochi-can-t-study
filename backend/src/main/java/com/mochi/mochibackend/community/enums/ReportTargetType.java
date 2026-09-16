package com.mochi.mochibackend.community.enums;

/**
 * Which kind of content a {@code CreateReportRequest} targets. Not
 * persisted on {@code Report} itself — the entity instead stores
 * exactly one of {@code postId}/{@code commentId}/{@code blogPostId},
 * same polymorphic-FK shape {@code Comment}/{@code Reaction} already
 * use; this enum only exists so the request payload has one clear
 * field, rather than asking the client to imply the type by which id
 * field they populate.
 */
public enum ReportTargetType {
    POST,
    COMMENT,
    BLOG_POST
}
