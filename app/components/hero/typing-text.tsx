'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

type TypingTextProps = {
	words: string[];
	className?: string;
};

export default function TypingText({ words, className }: TypingTextProps) {
	const reducedMotion = useReducedMotion();
	const firstWord = words[0] ?? '';
	const [wordIndex, setWordIndex] = useState(0);
	const [text, setText] = useState(firstWord);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (reducedMotion || words.length < 2) return;

		const target = words[wordIndex] ?? firstWord;
		const delay = deleting
			? text === ''
				? 100
				: 45
			: text === target
				? 1400
				: 70;
		const timer = window.setTimeout(() => {
			if (deleting) {
				if (text === '') {
					setDeleting(false);
					setWordIndex((index) => (index + 1) % words.length);
				} else {
					setText(text.slice(0, -1));
				}
			} else if (text === target) {
				setDeleting(true);
			} else {
				setText(target.slice(0, text.length + 1));
			}
		}, delay);

		return () => window.clearTimeout(timer);
	}, [deleting, firstWord, reducedMotion, text, wordIndex, words]);

	if (!firstWord) return null;

	return (
		<span className={className} aria-live='polite'>
			{reducedMotion ? firstWord : text}
			<span aria-hidden='true'>/</span>
		</span>
	);
}
