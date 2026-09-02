import { gsap } from 'gsap';

export default () => ({
  mode: 'normal',
  pupilRanges: {
    leftPupil: {
      left: 10,
      right: 8,
      up: 3,
      down: 12,
    },
    rightPupil: {
      left: 3,
      right: 8,
      up: 3,
      down: 12,
    },
  },

  init() {
    this.character = this.$refs.character;
    this.ropeEnd = this.$refs.ropeEnd;
    this.pupils = [
      { pupil: this.$el.querySelector('#left_pupil'), eye: this.$el.querySelector('#left_eye'), range: this.pupilRanges.leftPupil },
      { pupil: this.$el.querySelector('#right_pupil'), eye: this.$el.querySelector('#right_eye'), range: this.pupilRanges.rightPupil },
    ];
    this.svg = this.character.querySelector('svg');
    this.handlePointerMove = (event) => this.movePupils(event);

    document.addEventListener('pointermove', this.handlePointerMove);

    gsap.timeline()
      .delay(0.5)
      .fromTo(this.$el, { y: -window.innerHeight }, { y: 10, duration: 0.8, ease: "elastic.out(0.15, 0.1)" })
  },

  startle() {
    clearTimeout(this.modeTimer);
    this.mode = 'startled';
    gsap.killTweensOf(this.character);
    gsap.to(this.character, {
      x: 4,
      duration: 0.045,
      ease: 'none',
      repeat: 7,
      yoyo: true,
      onUpdate: () => {
        this.ropeEnd.setAttribute('x2', 99 + Number(gsap.getProperty(this.character, 'x')));
      },
      onComplete: () => this.ropeEnd.setAttribute('x2', 99),
    });
    this.modeTimer = setTimeout(() => {
      this.mode = 'normal';
    }, 500);
  },

  destroy() {
    document.removeEventListener('pointermove', this.handlePointerMove);
    clearTimeout(this.modeTimer);
    gsap.killTweensOf(this.character);
  },

  movePupils(event) {
    const svgPoint = this.svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const pointer = svgPoint.matrixTransform(this.svg.getScreenCTM().inverse());

    this.pupils.forEach(({ pupil, eye, range }) => {
      const eyeBounds = eye.getBBox();
      const pupilBounds = pupil.getBBox();
      const pupilCenter = {
        x: pupilBounds.x + pupilBounds.width / 2,
        y: pupilBounds.y + pupilBounds.height / 2,
      };
      const direction = {
        x: pointer.x - (eyeBounds.x + eyeBounds.width / 2),
        y: pointer.y - (eyeBounds.y + eyeBounds.height / 2),
      };
      const distance = Math.hypot(direction.x, direction.y) || 1;
      const offset = {
        x: (direction.x / distance) * (direction.x < 0 ? range.left : range.right),
        y: (direction.y / distance) * (direction.y < 0 ? range.up : range.down),
      };

      const clampedOffset = {
        x: Math.min(Math.max(offset.x, eyeBounds.x - pupilCenter.x), eyeBounds.x + eyeBounds.width - pupilCenter.x),
        y: Math.min(Math.max(offset.y, eyeBounds.y - pupilCenter.y), eyeBounds.y + eyeBounds.height - pupilCenter.y),
      };

      pupil.setAttribute('transform', `translate(${clampedOffset.x} ${clampedOffset.y})`);
    });
  },
})