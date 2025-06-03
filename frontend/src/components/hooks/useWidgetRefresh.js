import { useEffect, useRef } from 'react';
import { useWidgetContext } from '../contexts/widgetContext';
import { HttpClient } from '../../services/http';
import { Settings } from '../../settings';

/**
 * A hook that forces a refresh of widget data whenever a widget is updated
 *
 * @param {Object} options
 * @param {string} options.dashboardId - The ID of the dashboard to refresh widgets for
 * @param {Object} options.primaryObject - The primary object (project) from IbutsuContext
 */
export const useWidgetRefresh = ({ dashboardId, primaryObject }) => {
  const { updatedWidgets, setWidgets } = useWidgetContext();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    // Only run if we have updated widgets and a dashboard ID
    if (updatedWidgets.size > 0 && dashboardId) {
      // Add throttling to prevent excessive refreshes
      const now = Date.now();
      const minInterval = 1000; // Minimum 1 second between refreshes

      if (now - lastRefreshRef.current < minInterval) {
        return;
      }

      lastRefreshRef.current = now;

      const refreshWidgets = async () => {
        try {
          const response = await HttpClient.get(
            [Settings.serverUrl, 'widget-config'],
            {
              type: 'widget',
              filter: `dashboard_id=${dashboardId}`,
              _ts: now // Add timestamp to prevent caching
            }
          );
          const data = await HttpClient.handleResponse(response);
          const refreshedWidgets = data?.widgets.map((widget) => ({
            ...widget,
            params: {
              ...widget.params,
              project: primaryObject?.id
            }
          }));
          setWidgets(refreshedWidgets);
        } catch (error) {
          console.error('Error refreshing widgets:', error);
        }
      };

      // Debounce the refresh to avoid rapid successive calls
      const debouncer = setTimeout(() => {
        refreshWidgets();
      }, 300); // 300ms debounce time

      return () => clearTimeout(debouncer);
    }
  }, [updatedWidgets, dashboardId, primaryObject, setWidgets]);
};
