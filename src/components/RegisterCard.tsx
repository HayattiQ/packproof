"use client";

import { useState } from "react";
import type { CustodyTier, RegisterResponse, SlabImage } from "@/lib/http/responses";
import { CustodyTierChoice } from "@/components/CustodyTierChoice";
import { AgentPanel } from "@/components/AgentPanel";
import { Stepper } from "@/components/Stepper";
import { StatusBadge } from "@/components/StatusBadge";

const STEPS = ["Photo + cert", "Custody", "AI authentication", "Result"];

type Slab = SlabImage & { previewName: string };

async function fileToSlab(file: File, side: string): Promise<Slab> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { side, data: dataUrl, mime: file.type, previewName: file.name };
}

/**
 * Photo-first registration flow. No wallet connection anywhere: signing is
 * sponsored server-side by the relayer. Upload a slab photo, type/confirm the
 * cert number, pick a custody tier, and run the AI authentication pipeline.
 */
export function RegisterCard() {
  const [images, setImages] = useState<Slab[]>([]);
  const [certNumber, setCertNumber] = useState("");
  const [custodyTier, setCustodyTier] = useState<CustodyTier>("custodial");
  const [jurisdiction, setJurisdiction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step = result ? 3 : submitting ? 2 : images.length > 0 ? 1 : 0;

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const slabs = await Promise.all(
      Array.from(files)
        .slice(0, 4)
        .map((f, i) => fileToSlab(f, i === 0 ? "front" : i === 1 ? "back" : `extra-${i}`)),
    );
    setImages(slabs);
  }

  async function handleSubmit() {
    setError(null);
    if (images.length === 0) {
      setError("Add at least one photo of the slab.");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          certNumber: certNumber || undefined,
          custodyTier,
          jurisdiction: jurisdiction || undefined,
          images: images.map(({ side, data, mime }) => ({ side, data, mime })),
        }),
      });
      const json = (await res.json()) as RegisterResponse | { ok: false; error: string };
      if (!("verdict" in json)) {
        setError(json.error);
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setImages([]);
    setCertNumber("");
    setResult(null);
    setError(null);
  }

  return (
    <section className="panel register-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Register a PSA card</p>
          <h3>Snap, authenticate, tokenize</h3>
        </div>
      </div>

      <Stepper steps={STEPS} current={step} />

      {!result && (
        <div className="register-form">
          <label className="upload-zone">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
            <span>{images.length > 0 ? `${images.length} photo(s) selected` : "Upload slab photo(s) — front & back"}</span>
          </label>
          {images.length > 0 && (
            <ul className="thumb-row">
              {images.map((img) => (
                <li key={img.previewName}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.data} alt={`${img.side} of slab`} />
                  <small>{img.side}</small>
                </li>
              ))}
            </ul>
          )}

          <label className="field">
            <span>PSA cert number (or let OCR read it)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 20003195"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Your country (compliance screening)</span>
            <input
              type="text"
              placeholder="e.g. US"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </label>

          <CustodyTierChoice value={custodyTier} onChange={setCustodyTier} />

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Authenticating…" : "Authenticate & tokenize"}
          </button>
          <p className="no-wallet-note">No wallet needed — signing is sponsored for you.</p>
        </div>
      )}

      {result && (
        <div className="register-result">
          <div className="result-headline">
            <StatusBadge
              tone={result.verdict === "approved" ? "passed" : result.verdict === "manual_review" ? "warning" : "failed"}
            />
            <h3>{result.message}</h3>
          </div>
          <dl className="result-facts">
            <div>
              <dt>Card</dt>
              <dd>{result.cardLabel ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Cert</dt>
              <dd>{result.certNumber || "—"}</dd>
            </div>
            <div>
              <dt>Grade</dt>
              <dd>{result.grade ?? "—"}</dd>
            </div>
            {result.valuation && (
              <div>
                <dt>Value</dt>
                <dd>
                  ${result.valuation.lowUsd.toLocaleString()} – ${result.valuation.highUsd.toLocaleString()}
                </dd>
              </div>
            )}
            {result.mint && (
              <div>
                <dt>NFT</dt>
                <dd>
                  #{result.mint.tokenId} {result.mint.simulated ? "(simulated)" : "(on-chain)"}
                </dd>
              </div>
            )}
          </dl>

          <AgentPanel agents={result.agents} reportHash={result.reportHash} attestations={result.attestations} />

          <button className="secondary-button" type="button" onClick={reset}>
            Register another card
          </button>
        </div>
      )}
    </section>
  );
}
