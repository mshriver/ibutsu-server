import PropTypes from 'prop-types';
import { createContext, useReducer, useContext } from 'react';

// Initial state for widgets
const initialState = {
  widgets: {}, // Map of widget id to widget data
  updatedWidgets: new Set(), // Set of widget ids that need to be re-fetched
};

// Actions
const WIDGET_ACTIONS = {
  SET_WIDGETS: 'SET_WIDGETS',
  UPDATE_WIDGET: 'UPDATE_WIDGET',
  DELETE_WIDGET: 'DELETE_WIDGET',
  CLEAR_UPDATED: 'CLEAR_UPDATED',
};

// Reducer function to update state based on actions
const widgetReducer = (state, action) => {
  switch (action.type) {
    case WIDGET_ACTIONS.SET_WIDGETS:
      return {
        ...state,
        widgets: action.payload.reduce((acc, widget) => {
          acc[widget.id] = widget;
          return acc;
        }, {}),
        updatedWidgets: new Set(), // Reset updated widgets
      };
    case WIDGET_ACTIONS.UPDATE_WIDGET:
      return {
        ...state,
        widgets: {
          ...state.widgets,
          [action.payload.id]: action.payload,
        },
        updatedWidgets: new Set(state.updatedWidgets).add(action.payload.id),
      };
    case WIDGET_ACTIONS.DELETE_WIDGET: {
      const { [action.payload]: _, ...remainingWidgets } = state.widgets;
      return {
        ...state,
        widgets: remainingWidgets,
        updatedWidgets: new Set(state.updatedWidgets).add(action.payload),
      };
    }
    case WIDGET_ACTIONS.CLEAR_UPDATED:
      return {
        ...state,
        updatedWidgets: new Set(),
      };
    default:
      return state;
  }
};

// Create context
const WidgetContext = createContext();

// Widget provider component
const WidgetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(widgetReducer, initialState);

  // Actions to modify state
  const setWidgets = (widgets) => {
    dispatch({ type: WIDGET_ACTIONS.SET_WIDGETS, payload: widgets });
  };

  const updateWidget = (widget) => {
    dispatch({ type: WIDGET_ACTIONS.UPDATE_WIDGET, payload: widget });
  };

  const deleteWidget = (widgetId) => {
    dispatch({ type: WIDGET_ACTIONS.DELETE_WIDGET, payload: widgetId });
  };

  const clearUpdated = () => {
    dispatch({ type: WIDGET_ACTIONS.CLEAR_UPDATED });
  };

  // Value to be provided by the context
  const value = {
    widgets: Object.values(state.widgets),
    widgetsById: state.widgets,
    updatedWidgets: state.updatedWidgets,
    setWidgets,
    updateWidget,
    deleteWidget,
    clearUpdated,
  };

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
};

WidgetProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the widget context
const useWidgetContext = () => {
  const context = useContext(WidgetContext);
  if (context === undefined) {
    throw new Error('useWidgetContext must be used within a WidgetProvider');
  }
  return context;
};

export { WidgetContext, WidgetProvider, useWidgetContext };
