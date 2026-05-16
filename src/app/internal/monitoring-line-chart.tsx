"use client";

import ReactECharts from "echarts-for-react";

export function MonitoringLineChart({
  title,
  points,
  labels,
}: {
  title: string;
  points: number[];
  labels: string[];
}) {
  const option = {
    animation: true,
    grid: {
      left: 10,
      right: 10,
      top: 12,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "line",
      },
      backgroundColor: "rgba(17,17,17,0.92)",
      borderWidth: 0,
      textStyle: {
        color: "#fff",
        fontSize: 12,
      },
      valueFormatter: (value: unknown) => `${Number(value ?? 0)}`,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: "rgba(17,17,17,0.18)" } },
      axisLabel: { color: "rgba(17,17,17,0.52)", fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "rgba(17,17,17,0.08)", type: "dashed" } },
      axisLabel: { color: "rgba(17,17,17,0.45)", fontSize: 10 },
    },
    series: [
      {
        name: title,
        data: points,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: "#111111",
        },
        itemStyle: {
          color: "#111111",
        },
        areaStyle: {
          color: "rgba(17,17,17,0.08)",
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ width: "100%", height: 176 }}
    />
  );
}

