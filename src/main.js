import './style.scss'
import Alpine from 'alpinejs'
import logo01 from './assets/ka_01.svg'
import logo02 from './assets/ka_02.svg'
import logo03 from './assets/ka_03.svg'
import logo04 from './assets/ka_04.svg'

import karl from './components/karl'

Alpine.data('heroLogo', () => ({
	currentIndex: 0,
	svgMarkup: '',
	logos: [
		{ source: logo01, colorProperty: 'stroke' },
		{ source: logo02, colorProperty: 'fill' },
		{ source: logo03, colorProperty: 'fill' },
		{ source: logo04, colorProperty: 'stroke' },
	],
	palettes: [
		['var(--bg-00)', 'var(--text-color-00)'],
		['var(--bg-01)', 'var(--text-color-01)'],
		['var(--bg-02)', 'var(--text-color-02)'],
		['var(--bg-03)', 'var(--text-color-03)'],
	],

	init() {
		this.updateColors();
		this.loadLogo();
	},

	next() {
		this.currentIndex = (this.currentIndex + 1) % this.logos.length;
		this.updateColors();
		this.loadLogo();

		this.$dispatch('logo-changed', { index: this.currentIndex });
	},

	async loadLogo() {
		const logo = this.logos[this.currentIndex];
		const markup = await fetch(logo.source).then((response) => response.text());
		const documentFragment = new DOMParser().parseFromString(markup, 'image/svg+xml');
		const color = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

		documentFragment.querySelectorAll('path, use, rect, circle, ellipse, polygon, polyline, line').forEach((element) => {
			element.setAttribute(logo.colorProperty, color);
		});

		this.svgMarkup = documentFragment.documentElement.outerHTML;
	},

	updateColors() {
		const [background, text] = this.palettes[this.currentIndex];
		document.documentElement.style.setProperty('--bg', background);
		document.documentElement.style.setProperty('--text-color', text);
	},
}));

Alpine.data('hovertype', () => ({
	init() {
		this.splitIntoSpans();
	},

	splitIntoSpans() {
		const lineElements = this.$el.querySelectorAll('p');

		if (lineElements.length > 0) {
			lineElements.forEach((lineElement) => this.splitTextNodes(lineElement));
		} else {
			this.splitTextNodes(this.$el);
		}

		this.bindLetterHoverEvents();
	},

	splitTextNodes(rootElement) {
		[...rootElement.childNodes].forEach((node) => {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent ?? '';

				// Ignore formatting-only whitespace nodes from HTML indentation.
				if (text.trim() === '') return;

				const fragment = document.createDocumentFragment();
				for (const character of text) {
					const span = document.createElement('span');
					span.classList.add('letter');
					span.textContent = character;
					fragment.appendChild(span);
				}

				node.replaceWith(fragment);
				return;
			}

			if (node.nodeType === Node.ELEMENT_NODE) {
				this.splitTextNodes(node);
			}
		});
	},

	bindLetterHoverEvents() {
		[...this.$el.querySelectorAll('.letter')].forEach((letter) => {
			letter.addEventListener('pointerenter', () => this.applyFalloff(letter));
			letter.addEventListener('pointerleave', () => this.resetLetters());
		});
	},

	applyFalloff(activeLetter) {
		const activeBounds = activeLetter.getBoundingClientRect();
		const activeX = activeBounds.left + activeBounds.width / 2;
		const activeY = activeBounds.top + activeBounds.height / 2;
		const maxDistance = 180;

		this.$el.querySelectorAll('.letter').forEach((letter) => {
			const bounds = letter.getBoundingClientRect();
			const letterX = bounds.left + bounds.width / 2;
			const letterY = bounds.top + bounds.height / 2;
			const distance = Math.hypot(letterX - activeX, letterY - activeY);
			const influence = Math.max(0, 1 - distance / maxDistance);

			letter.style.setProperty('--weight', 400 + influence * 500);
			letter.style.setProperty('--width', 100 + influence * 25);
			letter.style.setProperty('--slnt', 100 + influence * 25);
		});
	},

	resetLetters() {
		this.$el.querySelectorAll('.letter').forEach((letter) => {
			letter.style.removeProperty('--weight');
			letter.style.removeProperty('--width');
			letter.style.removeProperty('--slnt');
		});
	},
}));

Alpine.data('hoverlist', ({ rolling = false, rollingThroughLis = false } = {}) => ({
	active: 'ka',
	rolling,
	rollingThroughLis,
	normalWdth: 100,
	normalWght: 300,

	activeWdth: 200,
	activeWght: 900,

	init() {
		this.listElement = this.$el;
		if (!this.rolling) return;

		this.listElement.querySelectorAll('li').forEach((item) => this.splitIntoSpans(item));
		this.updateLetters(this.active, 'right', false);
	},

	splitIntoSpans(textElement) {
		const text = textElement.textContent;
		textElement.textContent = '';
		for (const character of text) {
			const span = document.createElement('span');
			span.classList.add('letter');
			span.textContent = character;
			textElement.appendChild(span);
		}
	},

	activate(nextActive) {
		if (nextActive === this.active) return;

		const items = [...this.listElement.querySelectorAll('li')];
		const currentIndex = items.findIndex((item) => item.dataset.listName === this.active);
		const nextIndex = items.findIndex((item) => item.dataset.listName === nextActive);
		const direction = nextIndex > currentIndex ? 'right' : 'left';

		this.active = nextActive;
		if (!this.rolling) return;

		if (this.rollingThroughLis) {
			this.rollThroughItems(items, currentIndex, nextIndex, direction);
			return;
		}

		this.updateLetters(nextActive, direction, true);
	},

	rollThroughItems(items, currentIndex, nextIndex, direction) {
		this.waveTimers?.forEach((timer) => clearTimeout(timer));
		this.waveTimers = [];

		const step = currentIndex < nextIndex ? 1 : -1;
		const travelItems = [];
		for (let index = currentIndex; index !== nextIndex + step; index += step) {
			travelItems.push(items[index]);
		}

		items
			.filter((item) => !travelItems.includes(item))
			.forEach((item) => this.setItemLetters(item, false, direction, 0, false));

		travelItems.forEach((item, itemIndex) => {
			const isDestination = itemIndex === travelItems.length - 1;
			const startDelay = itemIndex * 120;

			if (itemIndex === 0) {
				this.setItemLetters(item, false, direction, 0);
				return;
			}

			this.setItemLetters(item, true, direction, startDelay);

			if (!isDestination) {
				this.waveTimers.push(setTimeout(() => {
					this.setItemLetters(item, false, direction, 0);
				}, startDelay + 180));
			}
		});
	},

	updateLetters(activeName, direction, shouldAnimate) {
		this.listElement.querySelectorAll('li').forEach((item) => {
			const isActive = item.dataset.listName === activeName;
			this.setItemLetters(item, isActive, direction, 0, shouldAnimate);
		});
	},

	setItemLetters(item, isActive, direction, startDelay, shouldAnimate = true) {
		const letters = [...item.querySelectorAll('.letter')];
		const orderedLetters = direction === 'right' ? letters : letters.reverse();

		orderedLetters.forEach((letter, index) => {
			letter.style.setProperty('--weight', isActive ? this.activeWght : this.normalWght);
			letter.style.setProperty('--width', isActive ? this.activeWdth : this.normalWdth);
			letter.style.setProperty('--letter-delay', shouldAnimate ? `${startDelay + index * 25}ms` : '0ms');
		});
	},
}));


Alpine.data('karl', karl);

Alpine.start()
