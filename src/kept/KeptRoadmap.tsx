import { Separator } from './parts.tsx';

interface RoadmapSection {
  id: string;
  label: string;
  description: string;
  items: [title: string, detail: string][];
}

const SECTIONS: RoadmapSection[] = [
  {
    id: 'now',
    label: 'NOW',
    description: 'Building the core.',
    items: [
      ['Reference library', 'A reliable place to save, browse, and manage visual references.'],
      ['Reference detail', 'A dedicated view for understanding and working with an individual reference.'],
      ['Metadata', 'Store useful context such as titles, sources, notes, tags, dates, and related information.'],
      ['Annotations', 'Add notes directly to specific points or regions of an image.'],
      ['Search', 'Find references through titles, notes, tags, boards, sources, and other saved context.'],
      ['Boards', 'Organize references into focused collections for projects, research, and visual exploration.'],
      ['Secure access', 'Private authentication and additional account protection for personal libraries.'],
      ['Production release', 'Bring the working Kept experience to kept.design.'],
    ],
  },
  {
    id: 'next',
    label: 'NEXT',
    description: 'Expanding the workflow.',
    items: [
      ['Capture from anywhere', 'Save references from more places with less friction.'],
      ['Save from a link', 'Add a URL and let Kept capture the reference and preserve its source.'],
      ['Duplicate detection', 'Catch references that have already been saved.'],
      ['Bulk actions', 'Select multiple references and organize or edit them together.'],
      ['Smart collections', 'Create saved collections that update automatically based on rules.'],
      ['Color search and filtering', 'Use colors extracted from references as another way to browse the library.'],
      ['Reference comparison', 'View references side by side for critique and visual analysis.'],
      ['Improved board layouts', 'Let references retain their natural proportions inside boards.'],
      ['Resurfacing', 'Bring forgotten references back into view when they may be useful again.'],
      ['Faster search access', 'Open search from anywhere in Kept.'],
    ],
  },
  {
    id: 'later',
    label: 'LATER',
    description: 'Extending Kept beyond the core library.',
    items: [
      ['Native iOS experience', 'A dedicated mobile experience for capturing and working with references.'],
      ['Share extension', 'Send images, links, and other references directly into Kept from iOS.'],
      ['Native capture', 'Quickly keep references from Photos, Safari, and other apps.'],
      ['Public and shared boards', 'Create collections that can be selectively shared with other people.'],
      ['Exports', 'Export references and boards into portable formats and visual contact sheets.'],
      ['Automatic metadata', 'Suggest useful tags, descriptions, and other context during capture.'],
      ['Text extraction', 'Make visible text inside references searchable.'],
      ['Semantic search', 'Find references based on meaning rather than exact words.'],
      ['Visual similarity', 'Discover references that look or feel related.'],
      ['Related references', 'Surface meaningful connections across the library.'],
      ['Provenance', 'Track where references came from and how they connect to sources, projects, and one another.'],
    ],
  },
];

export function KeptRoadmap() {
  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">Roadmap</h1>
      </section>

      <section className="KeptContents">
        <div className="KeptCol-body KeptStack KeptStack-4">
          <p className="KeptText2">
            Kept is being built in small, deliberate stages. This roadmap shows the major
            capabilities currently being developed, what comes next, and the longer-term direction
            of the product.
          </p>
          <p className="KeptText1 KeptMuted">Priorities may change as the product evolves.</p>
        </div>
      </section>

      {SECTIONS.map((section) => (
        <RoadmapList key={section.id} section={section} />
      ))}

      <Separator />
      <section className="KeptContents">
        <p className="KeptText1 KeptMuted KeptCol-body">
          Kept is actively evolving. The roadmap reflects current priorities and may change as the
          product develops.
        </p>
      </section>
    </>
  );
}

function RoadmapList({ section }: { section: RoadmapSection }) {
  const headingId = `kept-roadmap-${section.id}`;
  return (
    <>
      <Separator />
      <section className="KeptContents" aria-labelledby={headingId}>
        <div className="KeptStack KeptStack-0 KeptCol-label">
          <h2 id={headingId} className="KeptText2">{section.label}</h2>
          <span className="KeptText1 KeptMuted">{section.description}</span>
        </div>
        <div className="KeptCol-body">
          <ul className="KeptList">
            {section.items.map(([title, detail]) => (
              <li key={title} className="KeptListItem KeptListSingle">
                <span className="KeptStack KeptStack-0">
                  <span className="KeptText2">{title}</span>
                  <span className="KeptText1 KeptMuted">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
