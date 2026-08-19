export interface Heading {
	id: string;
	text: string;
	level: number;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function extractHeadings(content: string): Heading[] {
	const headings: Heading[] = [];
	const headingRegex = /^(#{2,3})\s+(.+)$/gm;
	let match = headingRegex.exec(content);

	while (match !== null) {
		const level = match[1].length;
		const text = match[2].trim();
		const id = slugify(text);

		headings.push({ id, text, level });
		match = headingRegex.exec(content);
	}

	return headings;
}
