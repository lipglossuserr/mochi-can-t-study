package com.mochi.mochibackend.exception;

public class AlreadyReportedException extends RuntimeException {

    public AlreadyReportedException(String message) {
        super(message);
    }
}
