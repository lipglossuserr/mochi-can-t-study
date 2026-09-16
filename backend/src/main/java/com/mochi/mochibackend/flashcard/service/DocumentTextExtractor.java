package com.mochi.mochibackend.flashcard.service;

import com.mochi.mochibackend.exception.FlashcardGenerationException;
import com.mochi.mochibackend.exception.UnsupportedFileTypeException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Turns an uploaded PDF/DOCX/PPTX/TXT/Markdown/ZIP into plain text for
 * FlashcardGenerationService to build a prompt from. Output is capped
 * at MAX_CHARS regardless of source — this keeps the AI prompt (and
 * cost) bounded even for a huge PDF, at the cost of only ever seeing
 * the first ~25k characters of very long material.
 */
@Component
public class DocumentTextExtractor {

    private static final int MAX_CHARS = 25_000;
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of("pdf", "docx", "pptx", "txt", "md", "zip");
    private static final Set<String> SUPPORTED_INNER_EXTENSIONS = Set.of("pdf", "docx", "pptx", "txt", "md");

    public String extract(MultipartFile file) {
        String extension = extensionOf(file.getOriginalFilename());
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new UnsupportedFileTypeException(
                    "Unsupported file type '." + extension + "' — upload a PDF, DOCX, PPTX, TXT, Markdown, or ZIP file.");
        }
        try {
            byte[] bytes = file.getBytes();
            String text = extension.equals("zip") ? extractZip(bytes) : extractFromBytes(bytes, extension);
            String trimmed = text.strip();
            if (trimmed.isEmpty()) {
                throw new FlashcardGenerationException("Mochi couldn't find any readable text in that file.");
            }
            return truncate(trimmed);
        } catch (IOException e) {
            throw new FlashcardGenerationException("Mochi couldn't read that file. Please try a different one.");
        }
    }

    private String extractFromBytes(byte[] bytes, String extension) throws IOException {
        return switch (extension) {
            case "pdf" -> extractPdf(bytes);
            case "docx" -> extractDocx(bytes);
            case "pptx" -> extractPptx(bytes);
            default -> new String(bytes, StandardCharsets.UTF_8); // txt / md
        };
    }

    private String extractPdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private String extractDocx(byte[] bytes) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private String extractPptx(byte[] bytes) throws IOException {
        try (XMLSlideShow slideShow = new XMLSlideShow(new ByteArrayInputStream(bytes))) {
            StringBuilder text = new StringBuilder();
            for (XSLFSlide slide : slideShow.getSlides()) {
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape textShape) {
                        text.append(textShape.getText()).append('\n');
                    }
                }
            }
            return text.toString();
        }
    }

    /** Extracts every supported file inside the ZIP and concatenates them under filename headers — this is what lets "upload a ZIP of lecture files" work as one combined study source. */
    private String extractZip(byte[] bytes) throws IOException {
        StringBuilder combined = new StringBuilder();
        try (ZipInputStream zipIn = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zipIn.getNextEntry()) != null) {
                if (entry.isDirectory() || combined.length() > MAX_CHARS) continue;
                String innerExtension = extensionOf(entry.getName());
                if (!SUPPORTED_INNER_EXTENSIONS.contains(innerExtension)) continue;

                byte[] entryBytes = zipIn.readAllBytes();
                combined.append("=== ").append(entry.getName()).append(" ===\n")
                        .append(extractFromBytes(entryBytes, innerExtension))
                        .append("\n\n");
            }
        }
        if (combined.isEmpty()) {
            throw new FlashcardGenerationException(
                    "That ZIP had no supported files inside (PDF, DOCX, PPTX, TXT, or Markdown).");
        }
        return combined.toString();
    }

    private String truncate(String text) {
        return text.length() <= MAX_CHARS ? text : text.substring(0, MAX_CHARS) + "\n\n[...truncated for length...]";
    }

    private String extensionOf(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? "" : filename.substring(dot + 1).toLowerCase();
    }
}