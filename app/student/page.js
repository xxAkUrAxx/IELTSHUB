"use client";

import { useEffect, useState } from "react";
import StudentShell from "./_components/student-shell";
import { useAuth } from "../../lib/firebase/auth-context";

const WIDGET_LAYOUT_STORAGE_KEY = "student-dashboard-widget-layout-v1";
const DEFAULT_WIDGET_LAYOUT = {
  totalTests: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  grammarPractice: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  listeningPractice: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  avgReadingBand: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  avgWritingBand: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  avgListeningBand: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  avgSpeakingBand: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  overallAvgBand: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: 0,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#0B114A",
    chartSecondaryColor: "#66C7E3",
  },
  typingSpeed: {
    cardWidth: 240,
    cardHeight: 150,
    chartSize: 220,
    titleGap: -24,
    chartBottomPadding: 0,
    valueGap: -6,
    titleSize: 18,
    textColor: "#F8FAFC",
    chartPrimaryColor: "#FF1E1E",
    chartSecondaryColor: "#66C7E3",
  },
};

function normalizeProfileKey(key) {
  return String(key).toLowerCase().replace(/[^a-z]/g, "");
}

function readProfileValue(profile, keys) {
  const normalizedKeys = keys.map(normalizeProfileKey);

  for (const [key, rawValue] of Object.entries(profile || {})) {
    if (!normalizedKeys.includes(normalizeProfileKey(key))) {
      continue;
    }

    if (typeof rawValue === "string" && rawValue.trim()) {
      return rawValue.trim();
    }
  }

  return "";
}

function getStudentWelcomeLabel(profile) {
  const nickname = readProfileValue(profile, [
    "Nickname",
    "nickname",
    "nickName",
    "displayName",
  ]);
  const firstName = readProfileValue(profile, [
    "Name",
    "name",
    "firstName",
    "firstname",
  ]);
  const surname = readProfileValue(profile, [
    "Surname",
    "surname",
    "lastName",
    "lastname",
    "familyName",
  ]);
  const fullName = [firstName, surname].filter(Boolean).join(" ");

  if (nickname && fullName) {
    return `Welcome ${nickname} (${fullName})`;
  }

  if (nickname) {
    return `Welcome ${nickname}`;
  }

  if (fullName) {
    return `Welcome (${fullName})`;
  }

  return "Welcome";
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

function calculateIeltsOverallBand(scores) {
  const numericScores = scores.filter(
    (score) => typeof score === "number" && !Number.isNaN(score)
  );

  if (!numericScores.length) {
    return 0;
  }

  const average =
    numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length;

  return Math.round((average + Number.EPSILON) * 2) / 2;
}

function formatBandScore(score) {
  return score.toFixed(1);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function sanitizeNumber(value, fallback, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return clamp(value, min, max);
}

function sanitizeWidgetConfig(config, defaults) {
  return {
    ...defaults,
    ...config,
    cardWidth: sanitizeNumber(config?.cardWidth, defaults.cardWidth, 240, 520),
    cardHeight: sanitizeNumber(config?.cardHeight, defaults.cardHeight, 150, 420),
    chartSize: sanitizeNumber(config?.chartSize, defaults.chartSize, 72, 220),
    titleGap: sanitizeNumber(config?.titleGap, defaults.titleGap, -24, 48),
    chartBottomPadding: sanitizeNumber(
      config?.chartBottomPadding,
      defaults.chartBottomPadding,
      0,
      48
    ),
    valueGap: sanitizeNumber(config?.valueGap, defaults.valueGap, -24, 48),
    titleSize: sanitizeNumber(config?.titleSize, defaults.titleSize, 16, 36),
    textColor: isHexColor(config?.textColor)
      ? config.textColor.toUpperCase()
      : defaults.textColor,
    chartPrimaryColor: isHexColor(config?.chartPrimaryColor)
      ? config.chartPrimaryColor.toUpperCase()
      : defaults.chartPrimaryColor,
    chartSecondaryColor: isHexColor(config?.chartSecondaryColor)
      ? config.chartSecondaryColor.toUpperCase()
      : defaults.chartSecondaryColor,
  };
}

function getInitialWidgetLayout() {
  return DEFAULT_WIDGET_LAYOUT;
}

function mergeWidgetLayout(savedLayout) {
  const mergedLayout = {
    totalTests: sanitizeWidgetConfig(
      savedLayout?.totalTests,
      DEFAULT_WIDGET_LAYOUT.totalTests
    ),
    grammarPractice: sanitizeWidgetConfig(
      savedLayout?.grammarPractice,
      DEFAULT_WIDGET_LAYOUT.grammarPractice
    ),
    listeningPractice: sanitizeWidgetConfig(
      savedLayout?.listeningPractice,
      DEFAULT_WIDGET_LAYOUT.listeningPractice
    ),
    avgReadingBand: sanitizeWidgetConfig(
      savedLayout?.avgReadingBand,
      DEFAULT_WIDGET_LAYOUT.avgReadingBand
    ),
    avgWritingBand: sanitizeWidgetConfig(
      savedLayout?.avgWritingBand,
      DEFAULT_WIDGET_LAYOUT.avgWritingBand
    ),
    avgListeningBand: sanitizeWidgetConfig(
      savedLayout?.avgListeningBand,
      DEFAULT_WIDGET_LAYOUT.avgListeningBand
    ),
    avgSpeakingBand: sanitizeWidgetConfig(
      savedLayout?.avgSpeakingBand,
      DEFAULT_WIDGET_LAYOUT.avgSpeakingBand
    ),
    overallAvgBand: sanitizeWidgetConfig(
      savedLayout?.overallAvgBand,
      DEFAULT_WIDGET_LAYOUT.overallAvgBand
    ),
    typingSpeed: sanitizeWidgetConfig(
      savedLayout?.typingSpeed,
      DEFAULT_WIDGET_LAYOUT.typingSpeed
    ),
  };

  if (mergedLayout.totalTests.cardHeight === 210) {
    mergedLayout.totalTests.cardHeight = 180;
  }

  if (mergedLayout.totalTests.titleGap === 0) {
    mergedLayout.totalTests.titleGap = -8;
  }

  if (mergedLayout.grammarPractice.cardHeight === 210) {
    mergedLayout.grammarPractice.cardHeight = 180;
  }

  if (mergedLayout.grammarPractice.titleGap === 0) {
    mergedLayout.grammarPractice.titleGap = -8;
  }

  if (mergedLayout.listeningPractice.cardHeight === 210) {
    mergedLayout.listeningPractice.cardHeight = 180;
  }

  if (mergedLayout.listeningPractice.titleGap === 0) {
    mergedLayout.listeningPractice.titleGap = -8;
  }

  if (mergedLayout.avgReadingBand.cardHeight === 210) {
    mergedLayout.avgReadingBand.cardHeight = 180;
  }

  if (mergedLayout.avgReadingBand.titleGap === 0) {
    mergedLayout.avgReadingBand.titleGap = -8;
  }

  if (mergedLayout.avgWritingBand.cardHeight === 210) {
    mergedLayout.avgWritingBand.cardHeight = 180;
  }

  if (mergedLayout.avgWritingBand.titleGap === 0) {
    mergedLayout.avgWritingBand.titleGap = -8;
  }

  if (mergedLayout.avgListeningBand.cardHeight === 210) {
    mergedLayout.avgListeningBand.cardHeight = 180;
  }

  if (mergedLayout.avgListeningBand.titleGap === 0) {
    mergedLayout.avgListeningBand.titleGap = -8;
  }

  if (mergedLayout.avgSpeakingBand.cardHeight === 210) {
    mergedLayout.avgSpeakingBand.cardHeight = 180;
  }

  if (mergedLayout.avgSpeakingBand.titleGap === 0) {
    mergedLayout.avgSpeakingBand.titleGap = -8;
  }

  if (mergedLayout.overallAvgBand.cardHeight === 210) {
    mergedLayout.overallAvgBand.cardHeight = 180;
  }

  if (mergedLayout.overallAvgBand.titleGap === 0) {
    mergedLayout.overallAvgBand.titleGap = -8;
  }

  if (mergedLayout.typingSpeed.cardHeight === 210) {
    mergedLayout.typingSpeed.cardHeight = 180;
  }

  if (mergedLayout.typingSpeed.titleGap === 0) {
    mergedLayout.typingSpeed.titleGap = -8;
  }

  return mergedLayout;
}

function WidgetControls({ config, onChange }) {
  function handleColorChange(property, value) {
    onChange(property, value.toUpperCase());
  }

  const safeConfig = {
    cardWidth: config?.cardWidth ?? 320,
    cardHeight: config?.cardHeight ?? 190,
    chartSize: config?.chartSize ?? 128,
    titleGap: config?.titleGap ?? -8,
    chartBottomPadding: config?.chartBottomPadding ?? 0,
    valueGap: config?.valueGap ?? 0,
    titleSize: config?.titleSize ?? 20,
    textColor: isHexColor(config?.textColor) ? config.textColor : "#F8FAFC",
    chartPrimaryColor: isHexColor(config?.chartPrimaryColor)
      ? config.chartPrimaryColor
      : "#0B114A",
    chartSecondaryColor: isHexColor(config?.chartSecondaryColor)
      ? config.chartSecondaryColor
      : "#66C7E3",
  };

  return (
    <div className="mt-4 grid gap-3 rounded-[20px] bg-base-200/40 p-4">
      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Card Width</span>
          <span>{safeConfig.cardWidth}px</span>
        </div>
        <input
          type="range"
          min="240"
          max="520"
          value={safeConfig.cardWidth}
          className="range range-sm"
          onChange={(event) =>
            onChange("cardWidth", Number(event.target.value))
          }
        />
      </label>

      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Card Height</span>
          <span>{safeConfig.cardHeight}px</span>
        </div>
        <input
          type="range"
          min="150"
          max="420"
          value={safeConfig.cardHeight}
          className="range range-sm"
          onChange={(event) =>
            onChange("cardHeight", Number(event.target.value))
          }
        />
      </label>

      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Chart Size</span>
          <span>{safeConfig.chartSize}px</span>
        </div>
        <input
          type="range"
          min="72"
          max="220"
          value={safeConfig.chartSize}
          className="range range-sm"
          onChange={(event) =>
            onChange("chartSize", Number(event.target.value))
          }
        />
      </label>

      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Title Gap</span>
          <span>{safeConfig.titleGap}px</span>
        </div>
        <input
          type="range"
          min="-24"
          max="48"
          value={safeConfig.titleGap}
          className="range range-sm"
          onChange={(event) =>
            onChange("titleGap", Number(event.target.value))
          }
        />
      </label>

      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Bottom Space</span>
          <span>{safeConfig.chartBottomPadding}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="48"
          value={safeConfig.chartBottomPadding}
          className="range range-sm"
          onChange={(event) =>
            onChange("chartBottomPadding", Number(event.target.value))
          }
        />
      </label>

      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Value Gap</span>
          <span>{safeConfig.valueGap}px</span>
        </div>
        <input
          type="range"
          min="-24"
          max="48"
          value={safeConfig.valueGap}
          className="range range-sm"
          onChange={(event) =>
            onChange("valueGap", Number(event.target.value))
          }
        />
      </label>

      <label className="grid gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          <span>Title Size</span>
          <span>{safeConfig.titleSize}px</span>
        </div>
        <input
          type="range"
          min="16"
          max="36"
          value={safeConfig.titleSize}
          className="range range-sm"
          onChange={(event) =>
            onChange("titleSize", Number(event.target.value))
          }
        />
      </label>

      <div className="grid gap-3 pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">
          Colors
        </p>

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-base-100/60 px-3 py-2">
          <span className="text-sm font-medium text-base-content/75">
            Text
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-base-content/50">
              {safeConfig.textColor}
            </span>
            <input
              type="color"
              value={safeConfig.textColor}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              onInput={(event) =>
                handleColorChange("textColor", event.target.value)
              }
              onChange={(event) =>
                handleColorChange("textColor", event.target.value)
              }
            />
          </div>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-base-100/60 px-3 py-2">
          <span className="text-sm font-medium text-base-content/75">
            Chart Primary
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-base-content/50">
              {safeConfig.chartPrimaryColor}
            </span>
            <input
              type="color"
              value={safeConfig.chartPrimaryColor}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              onInput={(event) =>
                handleColorChange("chartPrimaryColor", event.target.value)
              }
              onChange={(event) =>
                handleColorChange("chartPrimaryColor", event.target.value)
              }
            />
          </div>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-base-100/60 px-3 py-2">
          <span className="text-sm font-medium text-base-content/75">
            Chart Secondary
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-base-content/50">
              {safeConfig.chartSecondaryColor}
            </span>
            <input
              type="color"
              value={safeConfig.chartSecondaryColor}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
              onInput={(event) =>
                handleColorChange("chartSecondaryColor", event.target.value)
              }
              onChange={(event) =>
                handleColorChange("chartSecondaryColor", event.target.value)
              }
            />
          </div>
        </label>
      </div>
    </div>
  );
}

function DashboardWidget({
  title,
  config,
  isEditing,
  onChange,
  children,
  uppercaseTitle = true,
}) {
  return (
    <article
      className="rounded-[32px] border border-base-300 bg-base-100 p-4 shadow-sm transition-all"
      style={{
        width: `${config.cardWidth}px`,
        minHeight: isEditing ? `${config.cardHeight}px` : "auto",
      }}
    >
      <div className="flex h-full flex-col">
        <h2
          className={`text-center font-black leading-none tracking-tight ${uppercaseTitle ? "uppercase" : ""}`}
          style={{
            fontSize: `${config.titleSize}px`,
            color: config.textColor,
          }}
        >
          {title}
        </h2>

        {isEditing ? (
          <WidgetControls config={config} onChange={onChange} />
        ) : null}

        <div
          className="flex items-start justify-center"
          style={{
            marginTop: `${config.titleGap}px`,
            paddingBottom: `${config.chartBottomPadding}px`,
          }}
        >
          {children}
        </div>
      </div>
    </article>
  );
}

function ProgressDonut({
  chartSize,
  completionPercent,
  valueLabel,
  lightArcPath,
  darkArcPath,
  chartStroke,
  textColor,
  primaryColor,
  secondaryColor,
}) {
  return (
    <div
      className="relative flex items-center justify-center rounded-[24px] bg-base-200/25 px-4 py-3 shadow-inner"
      style={{ minWidth: `${chartSize + 32}px` }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ height: chartSize, width: chartSize }}
      >
        <svg
          viewBox="0 0 150 150"
          className="h-full w-full"
          aria-label="Progress chart"
        >
          <path
            d={lightArcPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={chartStroke}
            strokeLinecap="round"
          />
          <path
            d={darkArcPath}
            fill="none"
            stroke={primaryColor}
            strokeWidth={chartStroke}
            strokeLinecap="round"
          />
          <text
            x="75"
            y="75"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            className="text-[15px] font-medium"
          >
            {valueLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}

function ProgressDial({
  chartSize,
  value,
  maxValue,
  valueGap,
  textColor,
  primaryColor,
  secondaryColor,
}) {
  const safeMaxValue = maxValue > 0 ? maxValue : 60;
  const normalizedValue = clamp(value, 0, safeMaxValue);
  const progressRatio = normalizedValue / safeMaxValue;
  const needleAngle = 270 + progressRatio * 180;
  const dialWidth = chartSize;
  const dialHeight = Math.round(chartSize * 0.7);
  const labelFontSize = Math.max(16, Math.round(chartSize * 0.12));
  const needleBaseX = 75;
  const needleBaseY = 78;
  const needleLength = 42;
  const needleTip = polarToCartesian(
    needleBaseX,
    needleBaseY,
    needleLength,
    needleAngle
  );

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center rounded-[24px] bg-base-200/25 px-4 py-4 shadow-inner"
        style={{ minWidth: `${dialWidth + 32}px` }}
      >
        <svg
          viewBox="0 0 150 110"
          className="block"
          style={{ width: `${dialWidth}px`, height: `${dialHeight}px` }}
          aria-label="Typing speed dial"
        >
          <path
            d={describeArc(75, 78, 54, 270, 450)}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="22"
            strokeLinecap="butt"
          />
          <line
            x1={needleBaseX}
            y1={needleBaseY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={primaryColor}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle
            cx={needleBaseX}
            cy={needleBaseY}
            r="7"
            fill={primaryColor}
          />
        </svg>
      </div>

      <p
        className="text-center font-semibold tracking-tight"
        style={{
          marginTop: `${valueGap}px`,
          color: textColor,
          fontSize: `${labelFontSize}px`,
        }}
      >
        {normalizedValue} wpm
      </p>
    </div>
  );
}

export default function StudentPage() {
  const { profile, user } = useAuth();
  const [isWidgetEditing, setIsWidgetEditing] = useState(false);
  const [widgetLayout, setWidgetLayout] = useState(getInitialWidgetLayout);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedLayout = window.localStorage.getItem(WIDGET_LAYOUT_STORAGE_KEY);

    if (!savedLayout) {
      return;
    }

    try {
      setWidgetLayout(mergeWidgetLayout(JSON.parse(savedLayout)));
    } catch (error) {
      console.error("[Student Dashboard] Failed to parse widget layout.", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      WIDGET_LAYOUT_STORAGE_KEY,
      JSON.stringify(widgetLayout)
    );
  }, [widgetLayout]);

  const resolvedProfile = {
    ...profile,
    displayName: user?.displayName,
  };
  const welcomeLabel = getStudentWelcomeLabel(resolvedProfile);
  const completedMockTests = 4;
  const totalMockTests = 10;
  const totalTestsCompletionPercent = Math.round(
    (completedMockTests / totalMockTests) * 100
  );
  const completedGrammarPractices = 6;
  const totalGrammarPractices = 10;
  const grammarPracticeCompletionPercent = Math.round(
    (completedGrammarPractices / totalGrammarPractices) * 100
  );
  const completedListeningPractices = 7;
  const totalListeningPractices = 10;
  const listeningPracticeCompletionPercent = Math.round(
    (completedListeningPractices / totalListeningPractices) * 100
  );
  const avgReadingBandScore = 7.5;
  const avgWritingBandScore = 6.5;
  const avgListeningBandScore = 8.0;
  const avgSpeakingBandScore = 7.0;
  const overallAvgBandScore = calculateIeltsOverallBand([
    avgReadingBandScore,
    avgWritingBandScore,
    avgListeningBandScore,
    avgSpeakingBandScore,
  ]);
  const typingSpeedWpm = 36;
  const typingSpeedMaxWpm = 60;
  const totalTestsWidget = widgetLayout.totalTests;
  const grammarPracticeWidget = widgetLayout.grammarPractice;
  const listeningPracticeWidget = widgetLayout.listeningPractice;
  const avgReadingBandWidget = widgetLayout.avgReadingBand;
  const avgWritingBandWidget = widgetLayout.avgWritingBand;
  const avgListeningBandWidget = widgetLayout.avgListeningBand;
  const avgSpeakingBandWidget = widgetLayout.avgSpeakingBand;
  const overallAvgBandWidget = widgetLayout.overallAvgBand;
  const typingSpeedWidget = widgetLayout.typingSpeed;
  const chartStroke = 18;
  const chartRadius = 38;
  const darkArcStart = 34;
  const totalTestsDarkArcSweep = (totalTestsCompletionPercent / 100) * 360;
  const totalTestsDarkArcEnd = darkArcStart + totalTestsDarkArcSweep;
  const totalTestsLightArcStart = totalTestsDarkArcEnd - 1.5;
  const totalTestsLightArcEnd = darkArcStart + 360;
  const totalTestsDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    totalTestsDarkArcEnd
  );
  const totalTestsLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    totalTestsLightArcStart,
    totalTestsLightArcEnd
  );
  const grammarPracticeDarkArcSweep =
    (grammarPracticeCompletionPercent / 100) * 360;
  const grammarPracticeDarkArcEnd =
    darkArcStart + grammarPracticeDarkArcSweep;
  const grammarPracticeLightArcStart = grammarPracticeDarkArcEnd - 1.5;
  const grammarPracticeLightArcEnd = darkArcStart + 360;
  const grammarPracticeDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    grammarPracticeDarkArcEnd
  );
  const grammarPracticeLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    grammarPracticeLightArcStart,
    grammarPracticeLightArcEnd
  );
  const listeningPracticeDarkArcSweep =
    (listeningPracticeCompletionPercent / 100) * 360;
  const listeningPracticeDarkArcEnd =
    darkArcStart + listeningPracticeDarkArcSweep;
  const listeningPracticeLightArcStart = listeningPracticeDarkArcEnd - 1.5;
  const listeningPracticeLightArcEnd = darkArcStart + 360;
  const listeningPracticeDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    listeningPracticeDarkArcEnd
  );
  const listeningPracticeLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    listeningPracticeLightArcStart,
    listeningPracticeLightArcEnd
  );
  const avgReadingBandCompletionPercent = Math.round(
    (avgReadingBandScore / 9) * 100
  );
  const avgReadingBandDarkArcSweep =
    (avgReadingBandCompletionPercent / 100) * 360;
  const avgReadingBandDarkArcEnd = darkArcStart + avgReadingBandDarkArcSweep;
  const avgReadingBandLightArcStart = avgReadingBandDarkArcEnd - 1.5;
  const avgReadingBandLightArcEnd = darkArcStart + 360;
  const avgReadingBandDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    avgReadingBandDarkArcEnd
  );
  const avgReadingBandLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    avgReadingBandLightArcStart,
    avgReadingBandLightArcEnd
  );
  const avgWritingBandCompletionPercent = Math.round(
    (avgWritingBandScore / 9) * 100
  );
  const avgWritingBandDarkArcSweep =
    (avgWritingBandCompletionPercent / 100) * 360;
  const avgWritingBandDarkArcEnd = darkArcStart + avgWritingBandDarkArcSweep;
  const avgWritingBandLightArcStart = avgWritingBandDarkArcEnd - 1.5;
  const avgWritingBandLightArcEnd = darkArcStart + 360;
  const avgWritingBandDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    avgWritingBandDarkArcEnd
  );
  const avgWritingBandLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    avgWritingBandLightArcStart,
    avgWritingBandLightArcEnd
  );
  const avgListeningBandCompletionPercent = Math.round(
    (avgListeningBandScore / 9) * 100
  );
  const avgListeningBandDarkArcSweep =
    (avgListeningBandCompletionPercent / 100) * 360;
  const avgListeningBandDarkArcEnd =
    darkArcStart + avgListeningBandDarkArcSweep;
  const avgListeningBandLightArcStart = avgListeningBandDarkArcEnd - 1.5;
  const avgListeningBandLightArcEnd = darkArcStart + 360;
  const avgListeningBandDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    avgListeningBandDarkArcEnd
  );
  const avgListeningBandLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    avgListeningBandLightArcStart,
    avgListeningBandLightArcEnd
  );
  const avgSpeakingBandCompletionPercent = Math.round(
    (avgSpeakingBandScore / 9) * 100
  );
  const avgSpeakingBandDarkArcSweep =
    (avgSpeakingBandCompletionPercent / 100) * 360;
  const avgSpeakingBandDarkArcEnd = darkArcStart + avgSpeakingBandDarkArcSweep;
  const avgSpeakingBandLightArcStart = avgSpeakingBandDarkArcEnd - 1.5;
  const avgSpeakingBandLightArcEnd = darkArcStart + 360;
  const avgSpeakingBandDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    avgSpeakingBandDarkArcEnd
  );
  const avgSpeakingBandLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    avgSpeakingBandLightArcStart,
    avgSpeakingBandLightArcEnd
  );
  const overallAvgBandCompletionPercent = Math.round(
    (overallAvgBandScore / 9) * 100
  );
  const overallAvgBandDarkArcSweep =
    (overallAvgBandCompletionPercent / 100) * 360;
  const overallAvgBandDarkArcEnd = darkArcStart + overallAvgBandDarkArcSweep;
  const overallAvgBandLightArcStart = overallAvgBandDarkArcEnd - 1.5;
  const overallAvgBandLightArcEnd = darkArcStart + 360;
  const overallAvgBandDarkArcPath = describeArc(
    75,
    75,
    chartRadius,
    darkArcStart,
    overallAvgBandDarkArcEnd
  );
  const overallAvgBandLightArcPath = describeArc(
    75,
    75,
    chartRadius,
    overallAvgBandLightArcStart,
    overallAvgBandLightArcEnd
  );

  function handleWidgetConfigChange(widgetId, property, nextValue) {
    const isColorProperty =
      property === "textColor" ||
      property === "chartPrimaryColor" ||
      property === "chartSecondaryColor";

    if (isColorProperty) {
      setWidgetLayout((currentLayout) => ({
        ...currentLayout,
        [widgetId]: {
          ...currentLayout[widgetId],
          [property]: isHexColor(nextValue)
            ? nextValue.toUpperCase()
            : DEFAULT_WIDGET_LAYOUT[widgetId][property],
        },
      }));
      return;
    }

    const minValue =
      property === "cardWidth"
        ? 240
        : property === "cardHeight"
          ? 150
          : property === "chartSize"
            ? 72
            : property === "valueGap"
              ? -24
            : property === "titleSize"
              ? 16
            : property === "titleGap"
              ? -24
              : 0;
    const maxValue =
      property === "cardWidth"
        ? 520
        : property === "cardHeight"
          ? 420
          : property === "chartSize"
            ? 220
            : property === "valueGap"
              ? 48
            : property === "titleSize"
              ? 36
            : 48;

    setWidgetLayout((currentLayout) => ({
      ...currentLayout,
      [widgetId]: {
        ...currentLayout[widgetId],
        [property]: clamp(nextValue, minValue, maxValue),
      },
    }));
  }

  return (
    <StudentShell>
      <section className="flex min-h-[calc(100vh-4rem)] flex-col">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Home Dashboard
          </h1>
          <p className="mt-3 text-base font-medium text-base-content/70">
            {welcomeLabel}
          </p>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[24px] border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
          <button
            type="button"
            className={`btn btn-sm ${isWidgetEditing ? "btn-primary" : "btn-outline"}`}
            onClick={() => setIsWidgetEditing((currentValue) => !currentValue)}
          >
            {isWidgetEditing ? "Done Adjusting" : "Adjust Widgets"}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start gap-6">
            <DashboardWidget
              title="Total Tests Done"
              config={totalTestsWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("totalTests", property, value)
              }
            >
              <ProgressDonut
                chartSize={totalTestsWidget.chartSize}
                completionPercent={totalTestsCompletionPercent}
                valueLabel={`${totalTestsCompletionPercent}%`}
                lightArcPath={totalTestsLightArcPath}
                darkArcPath={totalTestsDarkArcPath}
                chartStroke={chartStroke}
                textColor={totalTestsWidget.textColor}
                primaryColor={totalTestsWidget.chartPrimaryColor}
                secondaryColor={totalTestsWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="Grammar Practice Done"
              config={grammarPracticeWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("grammarPractice", property, value)
              }
            >
              <ProgressDonut
                chartSize={grammarPracticeWidget.chartSize}
                completionPercent={grammarPracticeCompletionPercent}
                valueLabel={`${grammarPracticeCompletionPercent}%`}
                lightArcPath={grammarPracticeLightArcPath}
                darkArcPath={grammarPracticeDarkArcPath}
                chartStroke={chartStroke}
                textColor={grammarPracticeWidget.textColor}
                primaryColor={grammarPracticeWidget.chartPrimaryColor}
                secondaryColor={grammarPracticeWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="Total Listening Practice Done"
              config={listeningPracticeWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("listeningPractice", property, value)
              }
            >
              <ProgressDonut
                chartSize={listeningPracticeWidget.chartSize}
                completionPercent={listeningPracticeCompletionPercent}
                valueLabel={`${listeningPracticeCompletionPercent}%`}
                lightArcPath={listeningPracticeLightArcPath}
                darkArcPath={listeningPracticeDarkArcPath}
                chartStroke={chartStroke}
                textColor={listeningPracticeWidget.textColor}
                primaryColor={listeningPracticeWidget.chartPrimaryColor}
                secondaryColor={listeningPracticeWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="Typing Speed"
              config={typingSpeedWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("typingSpeed", property, value)
              }
              uppercaseTitle={false}
            >
              <ProgressDial
                chartSize={typingSpeedWidget.chartSize}
                value={typingSpeedWpm}
                maxValue={typingSpeedMaxWpm}
                valueGap={typingSpeedWidget.valueGap}
                textColor={typingSpeedWidget.textColor}
                primaryColor={typingSpeedWidget.chartPrimaryColor}
                secondaryColor={typingSpeedWidget.chartSecondaryColor}
              />
            </DashboardWidget>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <DashboardWidget
              title="AVG READING BAND"
              config={avgReadingBandWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("avgReadingBand", property, value)
              }
            >
              <ProgressDonut
                chartSize={avgReadingBandWidget.chartSize}
                completionPercent={avgReadingBandCompletionPercent}
                valueLabel={formatBandScore(avgReadingBandScore)}
                lightArcPath={avgReadingBandLightArcPath}
                darkArcPath={avgReadingBandDarkArcPath}
                chartStroke={chartStroke}
                textColor={avgReadingBandWidget.textColor}
                primaryColor={avgReadingBandWidget.chartPrimaryColor}
                secondaryColor={avgReadingBandWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="AVG WRITING BAND"
              config={avgWritingBandWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("avgWritingBand", property, value)
              }
            >
              <ProgressDonut
                chartSize={avgWritingBandWidget.chartSize}
                completionPercent={avgWritingBandCompletionPercent}
                valueLabel={formatBandScore(avgWritingBandScore)}
                lightArcPath={avgWritingBandLightArcPath}
                darkArcPath={avgWritingBandDarkArcPath}
                chartStroke={chartStroke}
                textColor={avgWritingBandWidget.textColor}
                primaryColor={avgWritingBandWidget.chartPrimaryColor}
                secondaryColor={avgWritingBandWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="AVG LISTENING BAND"
              config={avgListeningBandWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("avgListeningBand", property, value)
              }
            >
              <ProgressDonut
                chartSize={avgListeningBandWidget.chartSize}
                completionPercent={avgListeningBandCompletionPercent}
                valueLabel={formatBandScore(avgListeningBandScore)}
                lightArcPath={avgListeningBandLightArcPath}
                darkArcPath={avgListeningBandDarkArcPath}
                chartStroke={chartStroke}
                textColor={avgListeningBandWidget.textColor}
                primaryColor={avgListeningBandWidget.chartPrimaryColor}
                secondaryColor={avgListeningBandWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="AVG SPEAKING BAND"
              config={avgSpeakingBandWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("avgSpeakingBand", property, value)
              }
            >
              <ProgressDonut
                chartSize={avgSpeakingBandWidget.chartSize}
                completionPercent={avgSpeakingBandCompletionPercent}
                valueLabel={formatBandScore(avgSpeakingBandScore)}
                lightArcPath={avgSpeakingBandLightArcPath}
                darkArcPath={avgSpeakingBandDarkArcPath}
                chartStroke={chartStroke}
                textColor={avgSpeakingBandWidget.textColor}
                primaryColor={avgSpeakingBandWidget.chartPrimaryColor}
                secondaryColor={avgSpeakingBandWidget.chartSecondaryColor}
              />
            </DashboardWidget>

            <DashboardWidget
              title="OVERALL AVG"
              config={overallAvgBandWidget}
              isEditing={isWidgetEditing}
              onChange={(property, value) =>
                handleWidgetConfigChange("overallAvgBand", property, value)
              }
            >
              <ProgressDonut
                chartSize={overallAvgBandWidget.chartSize}
                completionPercent={overallAvgBandCompletionPercent}
                valueLabel={formatBandScore(overallAvgBandScore)}
                lightArcPath={overallAvgBandLightArcPath}
                darkArcPath={overallAvgBandDarkArcPath}
                chartStroke={chartStroke}
                textColor={overallAvgBandWidget.textColor}
                primaryColor={overallAvgBandWidget.chartPrimaryColor}
                secondaryColor={overallAvgBandWidget.chartSecondaryColor}
              />
            </DashboardWidget>
          </div>
        </div>
      </section>
    </StudentShell>
  );
}
