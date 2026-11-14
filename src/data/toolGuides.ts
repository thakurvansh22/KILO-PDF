export interface ToolStep {
  title: string;
  detail: string;
}

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolGuideData {
  id: string;
  name: string;
  route: string;
  seoTitle: string;
  seoDescription: string;
  howToTitle: string;
  steps: ToolStep[];
  faqs: ToolFaq[];
}

export const TOOL_GUIDES: Record<string, ToolGuideData> = {
  merge: {
    id: 'merge',
    name: 'Merge PDF',
    route: '/merge',
    seoTitle: 'Merge PDF Online Free – Combine PDF Files Privately',
    seoDescription: 'Combine multiple PDF documents into a single file in your browser. Zero uploads, instant page ordering, and complete privacy.',
    howToTitle: 'How to Merge PDF Files',
    steps: [
      { title: 'Add your PDF documents', detail: 'Drop two or more PDF files into the upload zone or click Choose PDF Files.' },
      { title: 'Arrange the file order', detail: 'Use the Up and Down buttons next to each document to set the exact order they should appear.' },
      { title: 'Add more or remove extras', detail: 'Append additional PDFs anytime or remove unwanted files before combining.' },
      { title: 'Merge and download', detail: 'Click Merge PDF Files to generate your unified document locally and download it right away.' },
    ],
    faqs: [
      { question: 'Are my PDFs uploaded to a server when merging?', answer: 'No. All files are read and combined directly inside your browser memory using JavaScript and WebAssembly.' },
      { question: 'Is there a limit on how many PDF files I can combine?', answer: 'There is no artificial cap. You can merge as many files as your device memory can hold comfortably.' },
      { question: 'Does merging change the quality or fonts of my pages?', answer: 'No. Pages are copied losslessly at the vector level, keeping original text, hyperlinks, and image clarity intact.' },
      { question: 'Can I merge PDFs with different page sizes?', answer: 'Yes. Each page keeps its original dimensions and orientation inside the combined document.' },
    ],
  },
  split: {
    id: 'split',
    name: 'Split PDF',
    route: '/split',
    seoTitle: 'Split PDF – Extract Pages or Split All into ZIP',
    seoDescription: 'Extract specific page ranges like 1-3, 5 or split every page into individual PDFs inside a ZIP archive completely offline.',
    howToTitle: 'How to Split a PDF File',
    steps: [
      { title: 'Upload one PDF document', detail: 'Select or drag a PDF into the dropzone to inspect its total page count.' },
      { title: 'Choose a split mode', detail: 'Pick Extract Range to pull specific pages into one PDF, or Split All to ZIP to save every page separately.' },
      { title: 'Enter page numbers (optional)', detail: 'In range mode, type ranges like 1-3, 5, 8-10 and verify the highlighted page count.' },
      { title: 'Export your result', detail: 'Click Extract Pages or Split All into ZIP to download your new PDF or archive instantly.' },
    ],
    faqs: [
      { question: 'How do I format custom page ranges?', answer: 'Use commas and hyphens such as 1-3, 5, 10-12. Page numbers start at 1.' },
      { question: 'What happens when I choose Split All to ZIP?', answer: 'Every single page is saved as its own standalone PDF file and bundled into one convenient ZIP download.' },
      { question: 'Will splitting alter the original PDF on my device?', answer: 'Never. Your source file remains untouched; a brand-new PDF or ZIP is created in memory.' },
      { question: 'Can I preview page numbers before splitting?', answer: 'Yes, you can review the document page count and inspect extracted page counts before exporting.' },
    ],
  },
  compress: {
    id: 'compress',
    name: 'Compress PDF',
    route: '/compress',
    seoTitle: 'Compress PDF – Reduce PDF File Size in Your Browser',
    seoDescription: 'Shrink PDF file sizes locally with Basic image compression or Light vector compression. Check before/after savings with zero uploads.',
    howToTitle: 'How to Compress a PDF',
    steps: [
      { title: 'Select your PDF file', detail: 'Upload the PDF you want to shrink to view its current file size and page count.' },
      { title: 'Pick Basic or Light mode', detail: 'Choose Basic Compress for maximum size reduction on scans, or Light Compress to keep selectable text.' },
      { title: 'Adjust quality level', detail: 'Select Low, Medium, High, or customize scale and JPEG quality sliders to balance size and sharpness.' },
      { title: 'Compress and compare', detail: 'Run compression and inspect the before/after byte savings before downloading compressed.pdf.' },
    ],
    faqs: [
      { question: 'What is the difference between Basic and Light compression?', answer: 'Basic compression converts pages into optimized JPEG images for major size cuts on scanned PDFs. Light compression keeps text selectable while stripping metadata and compressing object streams.' },
      { question: 'Why did my already-optimized PDF become slightly larger in Basic mode?', answer: 'Text-only vector PDFs are already tiny; converting vector text into raster images can add pixel overhead. In that case, choose Light Compress or download the original.' },
      { question: 'Will text remain selectable after Basic compression?', answer: 'No. Basic compression rasterizes each page as an image. Use Light Compress whenever selectable text must be preserved.' },
      { question: 'Is my confidential PDF sent to a remote server?', answer: 'No. Every page is rendered and re-packaged exclusively inside your local browser.' },
    ],
  },
  'pdf-to-word': {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    route: '/pdf-to-word',
    seoTitle: 'PDF to Word Converter (Beta) – Free Client-Side DOCX Export',
    seoDescription: 'Convert PDF pages into editable Microsoft Word (.docx) files right in your browser. Supports text, headings, lists, and images.',
    howToTitle: 'How to Convert PDF to Word',
    steps: [
      { title: 'Upload a PDF file', detail: 'Drop your PDF to see a first-page preview along with its file size and total page count.' },
      { title: 'Choose conversion mode', detail: 'Select Text only (clean), Text + Images, or Page as image for exact visual layout fidelity.' },
      { title: 'Pick a page range', detail: 'Convert the entire document or enter specific pages like 1-3, 5.' },
      { title: 'Convert and save .docx', detail: 'Click Convert to Word (.docx) to build the Word file locally and save it to your computer.' },
    ],
    faqs: [
      { question: 'Which conversion mode should I pick?', answer: 'Choose Text only for clean editable documents, Text + Images when figures matter, or Page as image for complex layouts and scans.' },
      { question: 'Does it work on scanned PDFs?', answer: 'Scanned PDFs contain images rather than selectable text. Use the Page as image mode or run our OCR tool first to extract editable text.' },
      { question: 'Why is PDF to Word marked as Beta?', answer: 'Because PDF stores visual coordinates rather than flow paragraphs, complex multi-column tables and custom fonts may shift slightly in Word.' },
      { question: 'Are headings and bullet points preserved?', answer: 'Yes. The converter detects larger or bold headings, simple bullet lists, and standard two-column layouts automatically.' },
    ],
  },
  ocr: {
    id: 'ocr',
    name: 'OCR Text Recognition',
    route: '/ocr',
    seoTitle: 'PDF OCR Online – Convert Scanned PDF to Searchable PDF & Text',
    seoDescription: 'Extract text from scanned PDFs with client-side Tesseract OCR. Supports English, Hindi, and Punjabi with searchable PDF output.',
    howToTitle: 'How to Run OCR on a Scanned PDF',
    steps: [
      { title: 'Upload your scanned PDF', detail: 'Load the PDF and choose which pages to process using the thumbnail checkboxes.' },
      { title: 'Select document languages', detail: 'Pick English, Hindi, Punjabi, or combine multiple languages for mixed-script documents.' },
      { title: 'Choose quality and outputs', detail: 'Set Fast, Good, or Best quality and check Searchable PDF, Plain Text (.txt), or Auto-Copy.' },
      { title: 'Recognize text locally', detail: 'Start OCR and wait while Tesseract processes each page. Download the searchable PDF or copy the extracted text.' },
    ],
    faqs: [
      { question: 'Why does the first run download language data?', answer: 'Tesseract traineddata files are fetched once and cached locally in your browser so recognition can run offline afterward.' },
      { question: 'What is a Searchable PDF?', answer: 'It keeps your original scanned page image visible while placing an invisible, selectable text layer underneath so you can search and copy text.' },
      { question: 'Can I make Hindi or Punjabi PDFs searchable?', answer: 'Full Hindi and Punjabi recognition works for Plain Text (.txt) and clipboard output. The invisible PDF layer currently supports English and Latin characters.' },
      { question: 'Can I stop a long OCR job midway?', answer: 'Yes. Click Cancel OCR at any time to terminate the worker safely and free browser memory.' },
    ],
  },
  'edit-pdf': {
    id: 'edit-pdf',
    name: 'Edit PDF & Sign',
    route: '/edit-pdf',
    seoTitle: 'Edit PDF & Sign Free – Add Text, Images, Signatures & Edit Text',
    seoDescription: 'Visually edit PDFs in your browser: add text boxes, edit existing lines, insert images, and sign documents with zero server uploads.',
    howToTitle: 'How to Edit and Sign a PDF',
    steps: [
      { title: 'Open your PDF in the editor', detail: 'Upload a PDF to view page thumbnails on the left and the interactive canvas in the center.' },
      { title: 'Choose an editing tool', detail: 'Use Add Text, Edit Text (for existing PDF lines), Add Image, or Signature from the top toolbar.' },
      { title: 'Customize in the inspector', detail: 'Adjust font family, size, color, bold/italic styling, or use the eyedropper when covering existing text.' },
      { title: 'Save your edited PDF', detail: 'Click Export PDF to compile all text edits, images, and signatures into a clean downloadable file.' },
    ],
    faqs: [
      { question: 'Can I edit text that is already inside a PDF?', answer: 'Yes. Select the Edit Text tool, click any highlighted text line, edit it inline, and adjust the background cover color if needed.' },
      { question: 'How can I create my signature?', answer: 'You can draw your signature with a mouse or touchscreen, type your name in a handwriting font, or upload an image signature.' },
      { question: 'Are undo and redo supported?', answer: 'Yes. Use the Undo and Redo buttons in the top toolbar to step backward or forward through your edits.' },
      { question: 'Are my signed contracts stored anywhere?', answer: 'No. Saved session signatures and edited PDFs stay strictly in your current browser tab.' },
    ],
  },
  watermark: {
    id: 'watermark',
    name: 'Watermark PDF',
    route: '/watermark',
    seoTitle: 'Add Watermark to PDF – Text & Image Watermarks with Drag Placement',
    seoDescription: 'Stamp custom text or image watermarks on PDF pages with opacity, rotation, tiling, and interactive drag-and-drop placement.',
    howToTitle: 'How to Add a Watermark to a PDF',
    steps: [
      { title: 'Upload your PDF document', detail: 'Load a PDF to view a live interactive preview of any page.' },
      { title: 'Choose Text or Image watermark', detail: 'Type custom text with font, color, and size controls, or upload a JPG/PNG logo image.' },
      { title: 'Position and style it', detail: 'Pick a 3x3 preset grid, enable Repeat Tile, or drag the watermark directly on the page preview to rotate and resize it.' },
      { title: 'Select pages and download', detail: 'Choose Over or Under content, pick All or specific pages, and download your watermarked PDF.' },
    ],
    faqs: [
      { question: 'Can I drag the watermark to any exact spot?', answer: 'Yes. Dragging the watermark on the live preview automatically switches to Custom position mode with X/Y percentage controls and snap guides.' },
      { question: 'Can I position the watermark differently on each page?', answer: 'Yes. Under Custom position scope, choose Set position per page and navigate pages in the preview to place each individually.' },
      { question: 'What is the difference between Over and Under content?', answer: 'Over content stamps the watermark on top of page text and images; Under content places it behind existing page elements like a background.' },
      { question: 'Can I repeat a watermark across the entire page?', answer: 'Yes. Toggle Repeat / Tile across page and adjust the spacing slider.' },
    ],
  },
  'page-numbers': {
    id: 'page-numbers',
    name: 'Page Numbers',
    route: '/page-numbers',
    seoTitle: 'Add Page Numbers to PDF – Custom Formats & Margins',
    seoDescription: 'Insert customizable page numbers into PDF documents locally. Choose position, format presets, start number, and odd/even mirroring.',
    howToTitle: 'How to Add Page Numbers to a PDF',
    steps: [
      { title: 'Upload your PDF', detail: 'Drop your document to inspect a live preview showing how page numbers will look.' },
      { title: 'Pick format and starting number', detail: 'Select presets like "Page 1 of N" or enter a custom template using {n} and {total}, and choose a start number.' },
      { title: 'Set placement and typography', detail: 'Pick a header/footer position, margin distance, font family, size, color, and optional odd/even alternating alignment.' },
      { title: 'Apply and download', detail: 'Optionally skip the cover page or target a custom page range, then export your numbered PDF.' },
    ],
    faqs: [
      { question: 'How do I skip page numbering on the cover page?', answer: 'Check the Skip first page option so numbering begins cleanly on page 2.' },
      { question: 'What placeholders work in custom formats?', answer: 'Use {n} for the current page number and {total} for the total page count, such as "Section A - {n} / {total}".' },
      { question: 'What does Different odd/even pages do?', answer: 'When placing numbers on left or right corners, it mirrors the alignment automatically on odd and even pages for book-style printing.' },
      { question: 'Does it work on landscape or rotated pages?', answer: 'Yes. Page rotation and page size are automatically detected so numbers stay in the visible margin.' },
    ],
  },
  rotate: {
    id: 'rotate',
    name: 'Rotate PDF',
    route: '/rotate',
    seoTitle: 'Rotate PDF Pages – Fix Upside-Down or Sideways PDFs',
    seoDescription: 'Rotate individual PDF pages or the entire document 90°, 180°, or 270° with instant thumbnail previews in your browser.',
    howToTitle: 'How to Rotate PDF Pages',
    steps: [
      { title: 'Upload your PDF file', detail: 'Load any PDF document to display visual thumbnails of every page.' },
      { title: 'Rotate individual or all pages', detail: 'Use the -90° and +90° buttons under any page card, or use the global Rotate All toolbar.' },
      { title: 'Verify orientation', detail: 'Check the live thumbnail preview and rotation badge on each card.' },
      { title: 'Apply and download', detail: 'Click Apply & Download Rotated PDF to embed the permanent rotation angles.' },
    ],
    faqs: [
      { question: 'Are page rotations saved permanently?', answer: 'Yes. The tool updates the standard PDF page rotation metadata so all PDF viewers display the corrected orientation.' },
      { question: 'Can I rotate just one scanned page instead of the whole file?', answer: 'Yes. Each page card has its own -90° and +90° buttons so you can fix only the pages that are sideways.' },
      { question: 'Does rotating pages lower image or text quality?', answer: 'No. Rotating PDF pages is completely lossless and does not re-encode text or graphics.' },
      { question: 'Can I undo rotations before exporting?', answer: 'Yes. Click Reset at the top toolbar anytime to return all pages to their original angles.' },
    ],
  },
  delete: {
    id: 'delete',
    name: 'Delete Pages',
    route: '/delete',
    seoTitle: 'Delete PDF Pages – Remove Unwanted Pages Privately',
    seoDescription: 'Visually select and remove unwanted pages from any PDF document directly in your browser without uploading files.',
    howToTitle: 'How to Delete Pages from a PDF',
    steps: [
      { title: 'Load your PDF document', detail: 'Upload a PDF to browse thumbnails of every page in your document.' },
      { title: 'Mark pages for removal', detail: 'Click any page card or its checkbox to mark it for deletion (highlighted in red).' },
      { title: 'Verify remaining count', detail: 'Confirm how many pages will be kept using the status bar at the top.' },
      { title: 'Delete and download', detail: 'Click Delete Selected Page(s) to save a clean PDF containing only the kept pages.' },
    ],
    faqs: [
      { question: 'What happens if I accidentally mark the wrong page?', answer: 'Just click the card again or press Restore Page to keep it before exporting.' },
      { question: 'Can I delete every single page in a PDF?', answer: 'No. A valid PDF must contain at least one page, so the tool prevents removing all pages simultaneously.' },
      { question: 'Is my original PDF file overwritten?', answer: 'No. A brand-new PDF is generated for download while your original file on disk stays intact.' },
      { question: 'Can I select ranges quickly?', answer: 'You can enter a quick page selection or use Select All and uncheck the few pages you want to keep.' },
    ],
  },
  reorder: {
    id: 'reorder',
    name: 'Reorder Pages',
    route: '/reorder',
    seoTitle: 'Reorder PDF Pages – Drag, Move, Swap & Replace Pages',
    seoDescription: 'Rearrange PDF pages with drag-and-drop, Move to position, First/Last buttons, page swapping, and cross-PDF page replacement.',
    howToTitle: 'How to Reorder PDF Pages',
    steps: [
      { title: 'Upload your PDF', detail: 'Select a PDF to display draggable thumbnails with original page number labels.' },
      { title: 'Drag or move pages', detail: 'Drag cards into place, use First/Last buttons, or click Move to and enter an exact target position.' },
      { title: 'Swap or replace pages (optional)', detail: 'Open the Replace / Swap panel to duplicate a page, swap two pages, or import a page from another PDF.' },
      { title: 'Save reordered PDF', detail: 'Click Save & Download Reordered PDF to export your newly arranged document.' },
    ],
    faqs: [
      { question: 'What does the "orig." label on each card mean?', answer: 'It shows the page’s original number from the uploaded PDF so you never lose track after moving cards around.' },
      { question: 'How does Move to position work?', answer: 'Click Move to on a card and type a destination number (e.g. move page 8 to 2); the card inserts there and other pages shift automatically.' },
      { question: 'Can I replace a damaged page with one from another PDF?', answer: 'Yes. Open Replace / Swap, choose From Another PDF, upload the second file, and pick the replacement page.' },
      { question: 'Can I duplicate a page?', answer: 'Yes. Replacing page A with page B places a copy of page B at A while keeping B in its original position.' },
    ],
  },
  'pdf-to-images': {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    route: '/pdf-to-images',
    seoTitle: 'PDF to Images – Export PDF Pages as JPG or PNG',
    seoDescription: 'Convert selected or all PDF pages into high-resolution JPG or PNG images in your browser. Download single images or a ZIP archive.',
    howToTitle: 'How to Convert PDF Pages to Images',
    steps: [
      { title: 'Upload your PDF document', detail: 'Load a PDF to inspect thumbnails and select the pages you want to export.' },
      { title: 'Pick format and resolution', detail: 'Choose JPG or PNG, set resolution quality (Low 1×, Medium 2×, High 3×), and adjust JPG compression.' },
      { title: 'Select pages to convert', detail: 'Use Select All, Clear, or click individual thumbnails to mark pages.' },
      { title: 'Download image or ZIP', detail: 'Export a single image directly if 1 page is selected, or download a bundled ZIP archive for multiple pages.' },
    ],
    faqs: [
      { question: 'Should I choose JPG or PNG?', answer: 'Choose JPG for smaller file sizes and scanned photos, or PNG for crisp screenshots, diagrams, and lossless sharpness.' },
      { question: 'How do Low, Medium, and High quality differ?', answer: 'They control rendering scale (1×, 2×, and 3×), producing progressively sharper pixel dimensions for zoom or printing.' },
      { question: 'Will converting a big PDF freeze my browser?', answer: 'No. Pages are rendered sequentially one by one, freeing canvas memory after every page.' },
      { question: 'Can I convert just one page without getting a ZIP file?', answer: 'Yes. When only 1 page is selected, the button automatically downloads that single JPG or PNG image directly.' },
    ],
  },
  'images-to-pdf': {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    route: '/images-to-pdf',
    seoTitle: 'Images to PDF – Convert JPG, PNG & WEBP to PDF Online',
    seoDescription: 'Combine JPG, PNG, and WEBP photos into a clean PDF document with drag-and-drop reordering, rotation, page sizes, and margins.',
    howToTitle: 'How to Convert Images to a PDF',
    steps: [
      { title: 'Add your image files', detail: 'Drag and drop JPG, PNG, or WEBP photos into the upload zone.' },
      { title: 'Arrange and rotate images', detail: 'Drag image cards to reorder them, and rotate or remove any photo before converting.' },
      { title: 'Configure PDF page layout', detail: 'Pick page size (A4, Letter, or Fit to Image), orientation (Auto, Portrait, Landscape), and margin spacing.' },
      { title: 'Create and download PDF', detail: 'Click Convert Images to PDF to generate and download images.pdf right inside your browser.' },
    ],
    faqs: [
      { question: 'Are WEBP images supported?', answer: 'Yes. WEBP images are automatically converted to lossless PNG inside your browser before embedding into the PDF.' },
      { question: 'What does Fit to Image do?', answer: 'It sizes each PDF page to match the exact dimensions of that photo, avoiding white letterbox bars.' },
      { question: 'How does Auto orientation work?', answer: 'Each page automatically switches between Portrait and Landscape depending on whether the photo is taller or wider.' },
      { question: 'Do my photos leave my device?', answer: 'Never. All image decoding and PDF assembly happen locally in your browser.' },
    ],
  },
  'pdf-to-text': {
    id: 'pdf-to-text',
    name: 'PDF to Text',
    route: '/pdf-to-text',
    seoTitle: 'PDF to Text – Extract Raw Text & Export .txt Free',
    seoDescription: 'Extract clean raw text page by page from any PDF in your browser. Search text, view word counts, copy, or download .txt.',
    howToTitle: 'How to Extract Text from a PDF',
    steps: [
      { title: 'Upload a PDF file', detail: 'Select or drop a PDF document to begin automatic page-by-page text extraction.' },
      { title: 'Review extracted text & stats', detail: 'Read the extracted content separated by page headers, along with total word and character counts.' },
      { title: 'Search within text (optional)', detail: 'Use the Find box to filter and highlight matching keywords across pages.' },
      { title: 'Copy or download .txt', detail: 'Click Copy Text to send everything to your clipboard or Download .txt to save a plain text file.' },
    ],
    faqs: [
      { question: 'Why did it say "This looks like a scanned PDF"?', answer: 'If a PDF consists of scanned images with no embedded digital text, raw extraction returns empty text. Use our OCR tool instead.' },
      { question: 'Are page breaks preserved in the output?', answer: 'Yes. Clear page separator headers like --- Page 1 of 4 --- are included between pages.' },
      { question: 'Can I search inside the extracted text?', answer: 'Yes. Type any keyword into the Find box to filter matching pages and highlight matches.' },
      { question: 'Is any extracted text logged or saved?', answer: 'No. Extraction runs completely client-side and disappears as soon as you close or refresh the tab.' },
    ],
  },
  'protect-pdf': {
    id: 'protect-pdf',
    name: 'Protect PDF',
    route: '/protect-pdf',
    seoTitle: 'Protect PDF with Password – Client-Side 128-Bit Encryption',
    seoDescription: 'Encrypt PDF files with a password and restrict printing, copying, or editing locally in your browser. Zero uploads.',
    howToTitle: 'How to Password Protect a PDF',
    steps: [
      { title: 'Upload your PDF document', detail: 'Select an unencrypted PDF to inspect its file size and page count.' },
      { title: 'Set a strong password', detail: 'Type and confirm your password using the live password strength meter as a guide.' },
      { title: 'Configure permissions', detail: 'Choose whether recipients are allowed to print, copy text/images, or modify the document.' },
      { title: 'Encrypt and download', detail: 'Click Encrypt & Protect PDF to apply 128-bit encryption locally and download protected.pdf.' },
    ],
    faqs: [
      { question: 'What happens if I forget my PDF password?', answer: 'If you forget the password, the file cannot be recovered. Keep a secure backup of your password and the original file.' },
      { question: 'Is my password ever sent over the network?', answer: 'No. Encryption happens 100% locally in your browser memory; passwords are never transmitted or stored.' },
      { question: 'Which PDF readers can open the protected file?', answer: 'Standard RC4 128-bit PDF encryption is supported by Adobe Acrobat, Chrome, Edge, Safari, macOS Preview, and mobile viewers.' },
      { question: 'Can I protect a PDF that is already password-locked?', answer: 'Unlock the existing file first with Unlock PDF, then apply your new password and permission settings.' },
    ],
  },
  'unlock-pdf': {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    route: '/unlock-pdf',
    seoTitle: 'Unlock PDF – Remove Password Protection with Known Password',
    seoDescription: 'Remove password prompts and restrictions from PDFs you own directly in your browser. Requires the valid document password.',
    howToTitle: 'How to Unlock a Password-Protected PDF',
    steps: [
      { title: 'Upload your encrypted PDF', detail: 'Drop your PDF to check automatically whether password protection is active.' },
      { title: 'Enter the document password', detail: 'Type the valid password required to open or authorize the PDF.' },
      { title: 'Decrypt locally', detail: 'Click Unlock Document to verify credentials and strip encryption restrictions in memory.' },
      { title: 'Download unlocked.pdf', detail: 'Save your unencrypted copy that opens without prompting for a password.' },
    ],
    faqs: [
      { question: 'Can this tool unlock a PDF if I do not know the password?', answer: 'No. You must know the valid password. This tool cannot crack, brute-force, or bypass unknown passwords.' },
      { question: 'What happens if I upload a PDF with no password?', answer: 'The tool detects that no encryption is present and informs you immediately that the PDF is already unprotected.' },
      { question: 'Will text stay selectable after unlocking?', answer: 'For standard RC4-protected PDFs, direct decryption keeps all vector text selectable. Stronger AES-256 files fall back to high-resolution page reconstruction.' },
      { question: 'Are my unlocked documents stored anywhere?', answer: 'No. Decryption runs completely inside your browser tab and nothing leaves your device.' },
    ],
  },
};
