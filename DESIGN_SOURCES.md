# MedCV 3.0 design and assistant notes

48 original designs, six per category: ATS & Professional, Nursing & Clinical, Modern Healthcare, Academic & Research, Leadership & Executive, Minimal & Editorial, International & Photo, Student & Graduate.

Within each category, presets change layout, header treatment, heading treatment and font family. Accent colour remains a user preference. PDF generation is column-aware and preserves searchable text. Photo designs should be used only when appropriate to the destination employer/country; ATS tags are conservative descriptions, not a guarantee of compatibility with every recruitment system.

Guidance consulted (not copied templates):
- RCN: https://www.rcn.org.uk/Professional-Development/Your-career/CV-writing
- RCN student CV: https://www.rcn.org.uk/Professional-Development/Your-career/Student/Student-nurse-CV-writing
- Harvard career examples: https://careerservices.fas.harvard.edu/resources/category/resume-cv-cover-letter-templates/
- Oxford academic CVs: https://www.careers.ox.ac.uk/academic-cvs

Rota-pro reference: https://github.com/Subha760/Rota-pro

MedCV implements its own code parser and duration calculations. Combined shifts become separate timed segments; no fixed 16-hour assumption. Imports operate on a single reviewed staff row, reject unknown/duplicate/out-of-month codes, and require the user to confirm the displayed entries. Calendar days replace existing entries only when explicitly clicked; text imports append and skip exact duplicates. OFF is omitted from calendar exports; leave becomes an all-day event. Hours are scheduled clock hours before breaks. Rest notices use an 11-hour heuristic and are not legal compliance checks.

Mira is a guided CV interview, not a remote model. The 15 local assistants use deterministic rules and editable templates; they do not contain pretrained neural model weights. Their outputs are suggestions based on supplied text, not verification of clinical knowledge or credentials. They require no keys, installation, account or network. Real-world clinical decisions should use the workplace's approved systems; SBAR tools here are fictional practice only.

Appearance and interview position are stored locally. CV drafts and workspace entries use the existing validated storage and backup system. Question position is convenience metadata; restored CVs can always be opened directly in the editor. AdSense publisher and slot remain empty.
