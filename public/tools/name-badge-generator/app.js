  (function () {
    'use strict';

    const DPI = 150;
    const MM_TO_IN = 1 / 25.4;

    const people = [];
    let currentIndex = 0;
    let logoImg = null;
    let bgImg = null;

    const $ = (id) => document.getElementById(id);
    const canvas = $('badge-canvas');
    const ctx = canvas.getContext('2d');

    console.log('Name Badge Generator loaded');
  })();
