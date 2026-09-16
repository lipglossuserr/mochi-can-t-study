package com.mochi.mochibackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Acknowledgement for a submitted focus batch. Duplicates are
 * acknowledged (accepted=false, duplicate=true) rather than rejected so
 * the client can retry after network failures without side effects.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FocusBatchAck {

    private String clientBatchId;
    private boolean accepted;
    private boolean duplicate;
}
