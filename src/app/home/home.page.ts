import {
  AfterViewInit,
  Component,
  OnDestroy
} from '@angular/core';

import { IonContent } from '@ionic/angular';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-homepage',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonContent],
})
export class HomepagePage implements AfterViewInit, OnDestroy {

  private ctx?: gsap.Context;
  private animationFrameId?: number;

  ngAfterViewInit(): void {

    gsap.registerPlugin(ScrollTrigger);

    this.ctx = gsap.context(() => {

      this.initializePage();
      this.createIntro();
      this.createCardFloat();
      this.createParallax();
      this.createCardHover();
      this.createScrollAnimation();
      this.createTeamAnimations();
      this.createStatsAnimation();
      this.createResultsHover();

    });

  }


  // ==========================================================
  // INITIAL STATES
  // ==========================================================

  private initializePage(): void {

    gsap.set('#nav', {
      opacity: 0,
      y: -20
    });

    gsap.set('.small-team .word > span', {
      y: '105%'
    });

    gsap.set('.big-results .letter', {
      y: 80,
      opacity: 0
    });

    gsap.set('#subline', {
      opacity: 0,
      y: 20
    });

    gsap.set('.t-card', {
      opacity: 0
    });

    gsap.set('.stats-inner', {
      opacity: 0
    });

    const cards =
      document.querySelectorAll<HTMLElement>('.card');

    cards.forEach((card) => {

      const rot =
        parseFloat(card.dataset['rot'] || '0');

      card.dataset['restRot'] =
        String(rot);

      gsap.set(card, {
        y: -800,
        rotation: rot + 25,
        opacity: 0,
        scale: 0.7
      });

    });

  }


  // ==========================================================
  // INTRO
  // ==========================================================

  private createIntro(): void {

    const intro = gsap.timeline({
      defaults: {
        ease: 'power3.out'
      }
    });

    intro
      .to(
        '#nav',
        {
          opacity: 1,
          y: 0,
          duration: 0.8
        },
        0.1
      )

      .to(
        '.small-team .word > span',
        {
          y: '0%',
          duration: 0.9,
          stagger: 0.08,
          ease: 'power3.out'
        },
        0.3
      )

      .to(
        '.big-results .letter',
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.05,
          ease: 'back.out(1.6)'
        },
        0.55
      )

      .to(
        '.card',
        {
          y: 0,
          opacity: 1,
          scale: 1,

          rotation: (_index: number, element: Element) => {

            const card =
              element as HTMLElement;

            return parseFloat(
              card.dataset['restRot'] || '0'
            );

          },

          duration: 1.1,

          stagger: {
            each: 0.08,
            from: 'center'
          },

          ease: 'back.out(1.4)'
        },
        0.8
      )

      .to(
        '#subline',
        {
          opacity: 1,
          y: 0,
          duration: 0.8
        },
        1.6
      );

  }


  // ==========================================================
  // FLOATING CARDS
  // ==========================================================

  private createCardFloat(): void {

    const cards =
      document.querySelectorAll<HTMLElement>('.card');

    cards.forEach((card, index) => {

      const rot =
        parseFloat(card.dataset['restRot'] || '0');

      gsap.to(card, {

        y: `+=${8 + (index % 3) * 5}`,

        rotation:
          rot +
          (index % 2 === 0 ? 1.5 : -1.5),

        duration:
          3 + (index % 4) * 0.5,

        delay:
          1.8 + index * 0.1,

        ease: 'sine.inOut',

        yoyo: true,

        repeat: -1

      });

    });

  }


  // ==========================================================
  // MOUSE PARALLAX
  // ==========================================================

  private createParallax(): void {

    const hero =
      document.querySelector<HTMLElement>('#hero');

    if (!hero) {
      return;
    }

    let mx = 0;
    let my = 0;

    let tx = 0;
    let ty = 0;

    hero.addEventListener('mousemove', (event: MouseEvent) => {

      const rect =
        hero.getBoundingClientRect();

      mx =
        ((event.clientX - rect.left) /
          rect.width - 0.5) * 2;

      my =
        ((event.clientY - rect.top) /
          rect.height - 0.5) * 2;

    });

    hero.addEventListener('mouseleave', () => {

      mx = 0;
      my = 0;

    });

    const animate = () => {

      tx += (mx - tx) * 0.05;
      ty += (my - ty) * 0.05;

      const cards =
        document.querySelectorAll<HTMLElement>('.card');

      cards.forEach((card) => {

        const depth =
          parseFloat(
            card.dataset['depth'] || '8'
          );

        card.style.translate =
          `${tx * depth}px ${ty * depth * 0.5}px`;

      });

      this.animationFrameId =
        requestAnimationFrame(animate);

    };

    animate();

  }


  // ==========================================================
  // CARD HOVER 3D
  // ==========================================================

  private createCardHover(): void {

    const cards =
      document.querySelectorAll<HTMLElement>('.card');

    cards.forEach((card) => {

      card.addEventListener(
        'mousemove',
        (event: MouseEvent) => {

          const rect =
            card.getBoundingClientRect();

          const px =
            (event.clientX - rect.left) /
            rect.width - 0.5;

          const py =
            (event.clientY - rect.top) /
            rect.height - 0.5;

          gsap.to(card, {

            rotateX: -py * 16,

            rotateY: px * 16,

            scale: 1.12,

            zIndex: 20,

            duration: 0.4,

            ease: 'power2.out',

            transformPerspective: 700,

            overwrite: 'auto'

          });

        }
      );

      card.addEventListener('mouseleave', () => {

        gsap.to(card, {

          rotateX: 0,

          rotateY: 0,

          scale: 1,

          zIndex: 1,

          duration: 0.8,

          ease: 'elastic.out(1, 0.6)',

          overwrite: 'auto'

        });

      });

      card.addEventListener('click', () => {

        gsap.fromTo(
          card,

          {
            scale: 1.15
          },

          {
            scale: 1.05,
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut'
          }
        );

      });

    });

  }


  // ==========================================================
  // SCROLL HERO
  // ==========================================================

  private createScrollAnimation(): void {

    const moves = [

      { x: -260, y: -40, rot: -25 },
      { x: -200, y: 20, rot: -18 },
      { x: -120, y: 80, rot: -10 },
      { x: -40, y: 120, rot: -4 },
      { x: 40, y: 120, rot: 4 },
      { x: 120, y: 80, rot: 12 },
      { x: 200, y: 20, rot: 22 },
      { x: 260, y: -40, rot: 28 }

    ];

    ScrollTrigger.create({

      trigger: '#hero',

      start: 'top top',

      end: 'bottom top',

      scrub: 0.8,

      onUpdate: (self: ScrollTrigger) => {

        const p =
          self.progress;

        gsap.set(
          '#bigResults',
          {
            scale: 1 + 0.15 * p,
            opacity: 1 - 0.4 * p
          }
        );

        gsap.set(
          '#smallTeam',
          {
            y: -60 * p,
            opacity: 1 - p * 1.5
          }
        );

        const cards =
          document.querySelectorAll<HTMLElement>('.card');

        cards.forEach((card, index) => {

          const move =
            moves[index];

          if (!move) {
            return;
          }

          const rest =
            parseFloat(
              card.dataset['restRot'] || '0'
            );

          gsap.set(card, {

            x: move.x * p,

            y: move.y * p,

            rotation:
              rest + move.rot * p

          });

        });

        gsap.set(
          '#subline',
          {
            opacity: 1 - p * 2
          }
        );

      }

    });

  }


  // ==========================================================
  // TEAM GRID
  // ==========================================================

  private createTeamAnimations(): void {

    gsap.from(
      '.eyebrow, .team-head h2, .team-head p',
      {

        opacity: 0,

        y: 30,

        duration: 0.9,

        stagger: 0.1,

        ease: 'power3.out',

        scrollTrigger: {

          trigger: '.team-head',

          start: 'top 80%'

        }

      }
    );

    gsap.fromTo(
      '.t-card',

      {

        opacity: 0,

        y: 80,

        scale: 0.9,

        rotation: (index: number) =>
          index % 2 === 0 ? -3 : 3

      },

      {

        opacity: 1,

        y: 0,

        scale: 1,

        duration: 1,

        stagger: 0.08,

        ease: 'back.out(1.3)',

        scrollTrigger: {

          trigger: '#teamGrid',

          start: 'top 80%'

        }

      }
    );

  }


  // ==========================================================
  // STATS
  // ==========================================================

  private createStatsAnimation(): void {

    gsap.fromTo(
      '.stats-inner',

      {

        opacity: 0,

        y: 60,

        scale: 0.97

      },

      {

        opacity: 1,

        y: 0,

        scale: 1,

        duration: 1.2,

        ease: 'power3.out',

        scrollTrigger: {

          trigger: '.stats',

          start: 'top 80%'

        }

      }
    );

    ScrollTrigger.create({

      trigger: '.stats',

      start: 'top 75%',

      once: true,

      onEnter: () => {

        const elements =
          document.querySelectorAll<HTMLElement>(
            '.stat-block .num'
          );

        elements.forEach((element) => {

          const target =
            parseFloat(
              element.dataset['count'] || '0'
            );

          const span =
            element.querySelector('span');

          if (!span) {
            return;
          }

          const counter = {
            value: 0
          };

          gsap.to(counter, {

            value: target,

            duration: 2,

            ease: 'power2.out',

            onUpdate: () => {

              span.textContent =
                Math.floor(
                  counter.value
                ).toLocaleString();

            }

          });

        });

      }

    });

  }


  // ==========================================================
  // BUTTON ANIMATION
  // ==========================================================

  animateButton(event: Event): void {

    const button =
      event.currentTarget as HTMLElement;

    gsap.fromTo(

      button,

      {
        scale: 1
      },

      {
        scale: 0.93,

        duration: 0.12,

        yoyo: true,

        repeat: 1,

        ease: 'power2.inOut'

      }

    );

  }


  // ==========================================================
  // BIG RESULTS HOVER
  // ==========================================================

  private createResultsHover(): void {

    const wrap =
      document.querySelector<HTMLElement>(
        '.big-results-wrap'
      );

    if (!wrap) {
      return;
    }

    wrap.addEventListener('mouseenter', () => {

      gsap.to(
        '.big-results .letter',
        {

          y: -8,

          duration: 0.5,

          stagger: 0.03,

          ease: 'back.out(1.6)'

        }
      );

    });

    wrap.addEventListener('mouseleave', () => {

      gsap.to(
        '.big-results .letter',
        {

          y: 0,

          duration: 0.6,

          stagger: 0.03,

          ease: 'elastic.out(1, 0.6)'

        }
      );

    });

  }


  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {

    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.ctx?.revert();

    ScrollTrigger.getAll().forEach(
      (trigger: ScrollTrigger) => trigger.kill()
    );

  }

}