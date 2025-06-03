import { useEffect, useMemo, useContext } from 'react';
import { HttpClient } from '../../services/http';
import { KNOWN_WIDGETS } from '../../constants';
import { Settings } from '../../settings';
import { GridItem } from '@patternfly/react-core';
import {
  FilterHeatmapWidget,
  HEATMAP_TYPES,
} from '../../widgets/filterheatmap';
import ResultAggregatorWidget from '../../widgets/resultaggregator';
import GenericAreaWidget from '../../widgets/genericarea';
import GenericBarWidget from '../../widgets/genericbar';
import ImportanceComponentWidget from '../../widgets/importancecomponent';
import ResultSummaryWidget from '../../widgets/resultsummary';
import { IbutsuContext } from '../contexts/ibutsuContext';
import { useWidgetContext } from '../contexts/widgetContext';

/**
 * Manage widgets for a dashboard and provide components for rendering
 * @param {Object} options
 * @param {string} options.dashboardId - Dashboard ID to fetch widgets for
 * @param {Function} options.editCallback - Callback when widget edit is requested
 * @param {Function} options.deleteCallback - Callback when widget delete is requested
 * @returns {Object} widgets and widget components for the dashboard
 */
export const useWidgets = ({
  dashboardId = null,
  editCallback = () => {},
  deleteCallback = () => {},
}) => {
  const { primaryObject } = useContext(IbutsuContext);
  const { widgets, setWidgets, updatedWidgets } = useWidgetContext();

  // Fetch widgets when needed
  useEffect(() => {
    if (!dashboardId) return;

    const getWidgets = async () => {
      try {
        const response = await HttpClient.get(
          [Settings.serverUrl, 'widget-config'],
          {
            type: 'widget',
            filter: `dashboard_id=${dashboardId}`,
          },
        );
        const data = await HttpClient.handleResponse(response);
        const fetchedWidgets = data?.widgets.map((widget) => ({
          ...widget,
          params: {
            ...widget.params,
            project: primaryObject?.id,
          },
        }));
        setWidgets(fetchedWidgets);
      } catch (error) {
        console.error('Error fetching widgets:', error);
      }
    };

    // Use a reasonable debounce time to avoid excessive re-renders
    const debouncedFetch = setTimeout(() => {
      getWidgets();
    }, 300); // Increased debounce time to reduce unnecessary fetches

    return () => clearTimeout(debouncedFetch);
  }, [dashboardId, primaryObject, updatedWidgets, setWidgets]);

  // Generate widget components based on widget data
  const widgetComponents = useMemo(() => {
    return widgets
      ?.map((widget) => {
        if (KNOWN_WIDGETS.includes(widget.widget)) {
          // Create a stable key that only changes when a specific widget is updated
          // This prevents unnecessary re-renders of all widgets when only one changes
          const key = updatedWidgets.has(widget.id)
            ? `${widget.id}-updated-${Date.now()}`
            : `${widget.id}`;
          return (
            <GridItem xl={4} lg={6} md={12} key={key}>
              {widget.type === 'widget' &&
                widget.widget === 'jenkins-heatmap' && (
                  <FilterHeatmapWidget
                    title={widget.title}
                    params={widget.params}
                    type={HEATMAP_TYPES.jenkins}
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'filter-heatmap' && (
                  <FilterHeatmapWidget
                    title={widget.title}
                    params={widget.params}
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'run-aggregator' && (
                  <GenericBarWidget
                    title={widget.title}
                    params={widget.params}
                    horizontal={true}
                    percentData={true}
                    barWidth={20}
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'result-summary' && (
                  <ResultSummaryWidget
                    title={widget.title}
                    params={widget.params}
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'result-aggregator' && (
                  <ResultAggregatorWidget
                    title={widget.title}
                    params={{
                      project: widget.params.project,
                      run_id: widget.params.run_id,
                      additional_filters: widget.params.additional_filters,
                    }}
                    chartType={widget.params.chart_type}
                    days={widget.params.days}
                    groupField={widget.params.group_field}
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'jenkins-line-chart' && (
                  <GenericAreaWidget
                    title={widget.title}
                    params={widget.params}
                    yLabel="Execution time"
                    widgetEndpoint="jenkins-line-chart"
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'jenkins-bar-chart' && (
                  <GenericBarWidget
                    title={widget.title}
                    params={widget.params}
                    barWidth={20}
                    horizontal={true}
                    hideDropdown={true}
                    widgetEndpoint="jenkins-bar-chart"
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
              {widget.type === 'widget' &&
                widget.widget === 'importance-component' && (
                  <ImportanceComponentWidget
                    title={widget.title}
                    params={widget.params}
                    barWidth={20}
                    horizontal={true}
                    hideDropdown={true}
                    widgetEndpoint="importance-component"
                    onDeleteClick={() => {
                      deleteCallback(widget.id);
                    }}
                    onEditClick={() => {
                      editCallback(widget.id);
                    }}
                  />
                )}
            </GridItem>
          );
        }
        return null;
      })
      .filter(Boolean); // Filter out null values
  }, [deleteCallback, editCallback, widgets, updatedWidgets]);

  return { widgets, widgetComponents };
};
