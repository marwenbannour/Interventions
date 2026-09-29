import PDFDocument from 'pdfkit';

/** Données consolidées d'un rapport d'intervention — indépendantes de la base (testable). */
export interface TaskReportData {
  organizationName: string;
  reference: string;
  title: string;
  description?: string | null;
  type: string;
  priority: string;
  origin: string;
  status: string;
  isRework: boolean;
  reworkOfReference?: string | null;
  client: { name: string; contractReference?: string | null };
  site: { name: string; address: string; postalCode?: string | null; city?: string | null };
  asset?: { code: string; name: string; brand?: string | null; model?: string | null; serialNumber?: string | null; location?: string | null } | null;
  agentName?: string | null;
  timeline: { label: string; at: Date | null }[];
  sla: { label: string; dueAt: Date | null; breached: boolean }[];
  checklist: { label: string; required: boolean; done: boolean; value?: string | null }[];
  notes: { at: Date; author?: string | null; text: string }[];
  completionNotes?: string | null;
  photos: { type: string; takenAt: Date; image: Buffer }[];
  signature?: { image: Buffer; name?: string | null } | null;
  evaluation?: { rating: number; comment?: string | null } | null;
  generatedAt: Date;
  timezone: string;
}

const PHOTO_LABEL: Record<string, string> = {
  BEFORE: 'Avant', AFTER: 'Après', PROOF: 'Preuve', ANOMALY: 'Anomalie', DOCUMENT: 'Document',
};
const ORIGIN_LABEL: Record<string, string> = {
  MANUAL: 'Saisie opérateur', CLIENT_REQUEST: 'Demande client', PREVENTIVE: 'Maintenance préventive', API: 'Intégration',
};
const PRIORITY_LABEL: Record<string, string> = { LOW: 'Basse', NORMAL: 'Normale', HIGH: 'Haute', URGENT: 'Urgente' };

const C = { primary: '#1F3A5F', muted: '#6B7280', line: '#D1D5DB', ok: '#15803D', ko: '#B91C1C', band: '#EEF2F7' };

/** Rapport PDF (A4) : identité, chronologie, SLA, checklist, observations, preuves, signature. */
export function renderTaskReport(d: TaskReportData): Promise<Buffer> {
  const fmt = (x: Date | null | undefined) =>
    x
      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: d.timezone }).format(x)
      : '—';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: { Title: `Rapport ${d.reference}`, Author: d.organizationName, Subject: d.title, Creator: 'FieldOps V3' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    const ensure = (h: number) => {
      if (doc.y + h > doc.page.height - 70) doc.addPage();
    };
    /** `keepWith` : hauteur du premier bloc à garder sur la même page que le titre (pas de titre orphelin). */
    const section = (title: string, keepWith = 16) => {
      ensure(40 + keepWith);
      doc.moveDown(0.8);
      const y = doc.y;
      doc.rect(50, y, W, 20).fill(C.band);
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(11).text(title, 58, y + 5);
      doc.fillColor('black').font('Helvetica').fontSize(10);
      doc.y = y + 26;
      doc.x = 50;
    };
    const row = (label: string, value: string) => {
      ensure(16);
      const y = doc.y;
      doc.font('Helvetica').fillColor(C.muted).fontSize(9).text(label, 50, y, { width: 150 });
      doc.fillColor('black').fontSize(10).text(value || '—', 200, y, { width: W - 150 });
      doc.y = Math.max(doc.y, y + 14);
    };

    // ---- En-tête
    doc.rect(0, 0, doc.page.width, 90).fill(C.primary);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text("Rapport d'intervention", 50, 26);
    doc.font('Helvetica').fontSize(10).text(d.organizationName, 50, 52);
    doc.font('Helvetica-Bold').fontSize(14).text(d.reference, 50, 26, { width: W, align: 'right' });
    doc.font('Helvetica').fontSize(9).text(`Émis le ${fmt(d.generatedAt)}`, 50, 50, { width: W, align: 'right' });
    doc.fillColor('black');
    doc.y = 110;

    doc.font('Helvetica-Bold').fontSize(13).text(d.title, 50, doc.y, { width: W });
    if (d.description) doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(d.description, { width: W }).fillColor('black');
    if (d.isRework) {
      doc.moveDown(0.4).font('Helvetica-Bold').fontSize(9).fillColor(C.ko)
        .text(`Réintervention${d.reworkOfReference ? ` — suite à ${d.reworkOfReference}` : ''}`).fillColor('black');
    }

    section('Informations');
    row('Client', `${d.client.name}${d.client.contractReference ? ` (contrat ${d.client.contractReference})` : ''}`);
    row('Site', d.site.name);
    row('Adresse', [d.site.address, [d.site.postalCode, d.site.city].filter(Boolean).join(' ')].filter(Boolean).join(', '));
    if (d.asset) {
      row('Équipement', `${d.asset.name} [${d.asset.code}]`);
      const tech = [d.asset.brand, d.asset.model, d.asset.serialNumber ? `n° ${d.asset.serialNumber}` : null].filter(Boolean).join(' · ');
      if (tech) row('Caractéristiques', tech);
      if (d.asset.location) row('Emplacement', d.asset.location);
    }
    row('Type', d.type);
    row('Priorité', PRIORITY_LABEL[d.priority] ?? d.priority);
    row('Origine', ORIGIN_LABEL[d.origin] ?? d.origin);
    row('Intervenant', d.agentName ?? '—');

    section('Chronologie');
    d.timeline.filter((t) => t.at).forEach((t) => row(t.label, fmt(t.at)));

    if (d.sla.some((s) => s.dueAt)) {
      section('Engagements de service (SLA)');
      d.sla.filter((s) => s.dueAt).forEach((s) => {
        ensure(16);
        const y = doc.y;
        doc.fillColor(C.muted).fontSize(9).text(s.label, 50, y, { width: 150 });
        doc.fillColor('black').fontSize(10).text(`Échéance ${fmt(s.dueAt)}`, 200, y, { width: 200 });
        doc.font('Helvetica-Bold').fillColor(s.breached ? C.ko : C.ok).text(s.breached ? 'Dépassé' : 'Respecté', 400, y, { width: W - 350, align: 'right' });
        doc.font('Helvetica').fillColor('black');
        doc.y = y + 14;
      });
    }

    if (d.checklist.length) {
      section('Points de contrôle');
      d.checklist.forEach((c) => {
        ensure(16);
        const y = doc.y;
        doc.font('Helvetica-Bold').fillColor(c.done ? C.ok : C.ko).fontSize(9).text(c.done ? 'FAIT' : 'NON FAIT', 50, y, { width: 60 });
        doc.font('Helvetica').fillColor('black').fontSize(10)
          .text(`${c.label}${c.required ? ' *' : ''}${c.value ? ` — ${c.value}` : ''}`, 115, y, { width: W - 65 });
        doc.y = Math.max(doc.y, y + 14);
      });
    }

    if (d.notes.length || d.completionNotes) {
      section('Observations');
      d.notes.forEach((n) => {
        ensure(28);
        doc.fontSize(8).fillColor(C.muted).text(`${fmt(n.at)}${n.author ? ` — ${n.author}` : ''}`, 50, doc.y);
        doc.fontSize(10).fillColor('black').text(n.text, { width: W });
        doc.moveDown(0.3);
      });
      if (d.completionNotes) {
        doc.font('Helvetica-Bold').fontSize(9).text('Compte rendu de fin', 50, doc.y);
        doc.font('Helvetica').fontSize(10).text(d.completionNotes, { width: W });
      }
    }

    if (d.photos.length) {
      const cols = 3;
      const gap = 10;
      const w = (W - gap * (cols - 1)) / cols;
      const h = w * 0.75;
      section('Preuves photographiques', h + 24);
      d.photos.forEach((p, i) => {
        if (i % cols === 0) ensure(h + 24);
        const col = i % cols;
        const x = 50 + col * (w + gap);
        const y = doc.y;
        try {
          doc.image(p.image, x, y, { fit: [w, h], align: 'center', valign: 'center' });
        } catch {
          doc.rect(x, y, w, h).stroke(C.line);
          doc.fontSize(8).fillColor(C.muted).text('Format non affichable', x, y + h / 2, { width: w, align: 'center' });
        }
        doc.fontSize(8).fillColor(C.muted).text(`${PHOTO_LABEL[p.type] ?? p.type} — ${fmt(p.takenAt)}`, x, y + h + 3, { width: w, align: 'center' });
        doc.fillColor('black');
        doc.y = col === cols - 1 || i === d.photos.length - 1 ? y + h + 18 : y;
      });
    }

    if (d.signature || d.evaluation) {
      section('Validation', d.signature ? 116 : 16);
      if (d.signature) {
        ensure(110);
        const y = doc.y;
        doc.fontSize(9).fillColor(C.muted).text('Signature du réceptionnaire', 50, y);
        try {
          doc.image(d.signature.image, 50, y + 14, { fit: [200, 80] });
        } catch {
          /* image illisible : on garde le nom */
        }
        doc.fillColor('black').fontSize(10).text(d.signature.name ?? '', 50, y + 98);
        doc.y = y + 116;
      }
      if (d.evaluation) {
        row('Évaluation client', `${d.evaluation.rating}/5${d.evaluation.comment ? ` — « ${d.evaluation.comment} »` : ''}`);
      }
    }

    // ---- Pied de page sur chaque page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Écrire dans la marge basse sans déclencher de saut de page automatique.
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 40;
      doc.moveTo(50, y - 6).lineTo(50 + W, y - 6).strokeColor(C.line).stroke();
      doc.fontSize(7).fillColor(C.muted).text(
        `${d.reference} — document généré automatiquement par FieldOps. Intégrité vérifiable par empreinte SHA-256 via l'API.`,
        50, y, { width: W - 60, lineBreak: false },
      );
      doc.text(`Page ${i - range.start + 1}/${range.count}`, 50, y, { width: W, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
