
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Joyride, { type Step, type CallBackProps, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useTheme } from 'next-themes';

interface AppTourProps {
  run: boolean;
  setRun: (run: boolean) => void;
  isPro: boolean;
  setActiveTab: (tab: string) => void;
}

const GRID_GENERATOR_STEPS: Step[] = [
    {
        target: '#tour-step-1-base-color',
        content: 'Start here by entering a base CMYK color. This will be the center of your grid.',
        disableBeacon: true,
    },
    {
        target: '#tour-step-pro-converters',
        content: 'Pro users can find a starting color from extensive Pantone® or vinyl libraries.',
    },
    {
        target: '#tour-step-2-grid-config',
        content: 'Next, configure your grid. Choose its size and how much the colors should vary.',
    },
    {
        target: '#tour-step-3-generate-button',
        content: 'Click here to generate your interactive color grid!',
    },
    {
        target: '#tour-step-4-color-grid',
        content: 'This is your grid. Hover over any color to see its details, and click to save it to your history.',
        placement: 'right',
    },
    {
        target: '#tour-step-5-color-history',
        content: 'Selected colors appear here. You can manage them and, with a Pro account, add them to specific jobs.',
        placement: 'left',
    },
    {
        target: '#tour-step-7-download-pdf',
        content: 'Pro users can download a true CMYK PDF, which bypasses browser color issues and is ready for professional printing.',
        placement: 'left',
    },
];

const IMAGE_EXTRACTOR_STEPS: Step[] = [
    {
        target: '#tour-step-image-upload',
        content: 'First, upload an image (JPG, PNG) or an SVG file. You can drag-and-drop or click to select.',
        disableBeacon: true,
    },
    {
        target: '#tour-step-image-canvas',
        content: 'For images, hover your mouse over the canvas to use the color "loupe", and click to pick a color.',
    },
    {
        target: '#tour-step-image-print-strip',
        content: 'Every color you pick is added to this Print Strip. You can then download it as a CMYK-accurate PDF for test printing.',
    },
    {
        target: '#tour-step-image-pro-features',
        content: 'For Pro users, uploading an SVG will extract its entire palette, and uploading an image will automatically detect prominent color gradients.',
        placement: 'left',
    },
];

const TRACKER_STEPS: Step[] = [
     {
        target: '.w-full.lg\\:w-\\[350px\\].flex.flex-col.flex-shrink-0',
        content: 'This panel shows all your projects, which we call "Jobs". Create a new job or select an existing one to get started.',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '.flex-grow.flex.flex-col',
        content: 'Once a job is selected, its tracked colors appear here. You can add, edit, and delete entries to maintain a full history.',
        placement: 'left',
    },
    {
        target: '.flex-grow.flex.flex-col',
        content: 'Hover over any color entry to reveal controls. You can edit notes, search for similar colors across ALL jobs, or delete an entry.',
        placement: 'left',
    },
     {
        target: '.flex-grow.flex.flex-col',
        content: 'When you update a color, the AI can suggest proportional updates for similar colors in other jobs, helping maintain consistency.',
        placement: 'left',
    },
];


export function AppTour({ run, setRun, isPro, setActiveTab }: AppTourProps) {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const tourSteps = useMemo(() => {
    let steps = [...GRID_GENERATOR_STEPS];
    
    // Add step to switch to Image Extractor
    steps.push({
      target: '#tour-step-tabs-image',
      content: 'Now let\'s check out the Image Color Extractor.',
    });
    steps = steps.concat(IMAGE_EXTRACTOR_STEPS);

    // Add step to switch to Colour Tracker if Pro
    if (isPro) {
      steps.push({
        target: '#tour-step-tabs-tracker',
        content: 'Finally, we\'ll look at the Colour Tracker, a powerful Pro feature for managing projects.',
      });
      steps = steps.concat(TRACKER_STEPS);
    }

    return steps;
  }, [isPro]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;
    
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setStepIndex(0);
      setRun(false);
      setActiveTab('grid-generator');
      return;
    }

    if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
      const newIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Ensure we don't go out of bounds
      if (newIndex >= 0 && newIndex < tourSteps.length) {
          const nextStep = tourSteps[newIndex];
          if (nextStep?.target === '#tour-step-tabs-image') {
            setActiveTab('image-color-extractor');
          } else if (nextStep?.target === '#tour-step-tabs-tracker') {
            setActiveTab('colour-tracker');
          } else if (newIndex === 0) {
            setActiveTab('grid-generator');
          }
      }
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  if (!isMounted) return null;

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      run={run}
      stepIndex={stepIndex}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={tourSteps}
      styles={{
        options: {
          arrowColor: theme === 'dark' ? '#1f1f23' : '#ffffff', // --card
          backgroundColor: theme === 'dark' ? '#1f1f23' : '#ffffff',
          primaryColor: theme === 'dark' ? '#E649E6' : '#6495ED', // --primary
          textColor: theme === 'dark' ? '#fcfcfc' : '#0a0a0a', // --foreground
          zIndex: 1000,
        },
        buttonClose: {
            display: 'none',
        }
      }}
    />
  );
}
