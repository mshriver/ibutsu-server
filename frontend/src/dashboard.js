import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  PageSection,
  PageSectionVariants,
  Select,
  TextContent,
  Text,
  EmptyStateHeader,
  EmptyStateFooter,
  MenuToggle,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';

import CubesIcon from '@patternfly/react-icons/dist/esm/icons/cubes-icon';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import TachometerAltIcon from '@patternfly/react-icons/dist/esm/icons/tachometer-alt-icon';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import TimesCircleIcon from '@patternfly/react-icons/dist/esm/icons/times-circle-icon';
import { useNavigate, useParams } from 'react-router-dom';

import { HttpClient } from './services/http';
import { Settings } from './settings';
import NewDashboardModal from './components/new-dashboard-modal';
import NewWidgetWizard from './components/new-widget-wizard';
import EditWidgetModal from './components/edit-widget-modal';
import DeleteModal from './components/delete-modal';
import { useWidgets } from './components/hooks/useWidgets';
import { IbutsuContext } from './components/contexts/ibutsuContext';
import {
  WidgetProvider,
  useWidgetContext,
} from './components/contexts/widgetContext';
import { useWidgetRefresh } from './components/hooks/useWidgetRefresh';

const DashboardContent = () => {
  const { defaultDashboard, primaryObject } = useContext(IbutsuContext);
  const { dashboard_id, project_id } = useParams();
  const { updateWidget, deleteWidget, setWidgets } = useWidgetContext();
  useWidgetRefresh({ dashboard_id, primaryObject });

  const navigate = useNavigate();

  // dashboard states
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState([]);
  const [filteredDashboards, setFilteredDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isNewDBOpen, setIsNewDBOpen] = useState(false);
  const [isDeleteDBOpen, setIsDeleteDBOpen] = useState(false);

  // widget states
  const [isNewWidgetOpen, setIsNewWidgetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editWidgetData, setEditWidgetData] = useState({});
  const [isDeleteWidgetOpen, setIsDeleteWidgetOpen] = useState(false);
  const [currentWidget, setCurrentWidget] = useState();

  // typeahead input value states
  const [selectInputValue, setSelectInputValue] = useState('');
  const [selectFilterValue, setSelectFilterValue] = useState('');
  const selectInputRef = useRef();

  const onDeleteWidgetClick = (id) => {
    setIsDeleteWidgetOpen(true);
    setCurrentWidget(id);
  };

  const onEditWidgetClick = (id) => {
    setIsEditModalOpen(true);

    const fetchWidgetData = async (id) => {
      try {
        const response = await HttpClient.get([
          Settings.serverUrl,
          'widget-config',
          id,
        ]);
        const data = await HttpClient.handleResponse(response);
        setCurrentWidget(id);
        setEditWidgetData(data);
      } catch (error) {
        alert(`Widget GET failed on edit: ${error}`);
        console.error(error);
      }
    };

    // Call the function
    const debouncer = setTimeout(() => {
      fetchWidgetData(id);
    }, 100);
    return () => {
      clearTimeout(debouncer);
    };
  };

  // Get widgets using new hook
  const { widgets, widgetComponents } = useWidgets({
    dashboardId: selectedDashboard?.id,
    editCallback: onEditWidgetClick,
    deleteCallback: onDeleteWidgetClick,
  });

  // Fetch all dashboards for the project
  useEffect(() => {
    setSelectedDashboard();
    setDashboards([]);
    setSelectInputValue('');
    let fetchedDashboards = [];
    const fetchDashboards = async (page = 1) => {
      try {
        const response = await HttpClient.get(
          [Settings.serverUrl, 'dashboard'],
          {
            project_id: primaryObject.id,
            pageSize: 50,
            page,
          },
        );
        const data = await HttpClient.handleResponse(response);
        const pagedDashboards = data['dashboards'];
        const paginationData = data['pagination'];
        fetchedDashboards = [...fetchedDashboards, ...pagedDashboards];
        if (
          pagedDashboards.length &&
          dashboard_id &&
          selectedDashboard?.id !== dashboard_id
        ) {
          const paramDashboard = pagedDashboards
            .filter((db) => db.id == dashboard_id)
            .pop();
          if (paramDashboard) {
            setSelectedDashboard(paramDashboard);
            setIsDashboardOpen(false);
            setSelectInputValue(paramDashboard.title);
          }
        }
        if (page < paginationData['totalPages']) {
          await fetchDashboards(page + 1);
        } else {
          setDashboards(fetchedDashboards);
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (primaryObject) {
      const debouncer = setTimeout(() => {
        fetchDashboards();
      }, 100);

      return () => {
        clearTimeout(debouncer);
      };
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryObject]);

  // Apply the default dashboard
  useEffect(() => {
    // selectedDashboard is undefined until user picks one or this sets it
    if (
      dashboards.length &&
      defaultDashboard &&
      selectedDashboard === undefined
    ) {
      const default_db = dashboards
        .filter((dash) => dash.id == defaultDashboard)
        .pop();
      if (default_db) {
        setSelectedDashboard(default_db);
        setSelectInputValue(default_db.title);
        navigate(
          `/project/${default_db.project_id}/dashboard/${default_db.id}`,
        );
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dashboards, !!selectedDashboard]); // only when they switch from undefined on first set

  // Apply filter inputs
  useEffect(() => {
    let filteredOptions = [...dashboards];
    if (selectFilterValue && dashboards.length) {
      filteredOptions = [...dashboards];

      filteredOptions = filteredOptions.filter((dashboard) =>
        dashboard.title.toLowerCase().includes(selectFilterValue.toLowerCase()),
      );
      if (!filteredOptions.length) {
        filteredOptions = [
          {
            isAriaDisabled: true,
            children: `No dashboards matching "${selectFilterValue}"`,
          },
        ];
      }
      if (!isDashboardOpen) {
        setIsDashboardOpen(true);
      }
    }

    setFilteredDashboards(filteredOptions);
  }, [selectFilterValue, dashboards, isDashboardOpen]);

  const onDashboardSelect = (_, value) => {
    if (value) {
      setSelectedDashboard(value);
      setIsDashboardOpen(false);
      setSelectFilterValue('');
      setSelectInputValue(String(value.title));

      navigate(`/project/${value.project_id}/dashboard/${value.id}`);
    }
  };

  const onDashboardClear = () => {
    // state update
    setSelectedDashboard();
    setIsDashboardOpen(false);
    setSelectInputValue('');
    setSelectFilterValue('');
    selectInputRef?.current?.focus();
    navigate(`/project/${project_id}/dashboard/`);
  };

  const onDashboardFilterInput = (_, value) => {
    setSelectInputValue(value);
    setSelectFilterValue(value);
    if (value !== selectedDashboard) {
      setSelectedDashboard(value);
    }
  };

  const onNewDashboardSave = async (newDashboard) => {
    try {
      const response = await HttpClient.post(
        [Settings.serverUrl, 'dashboard'],
        newDashboard,
      );
      const data = await HttpClient.handleResponse(response);
      setIsNewDBOpen(false);
      onDashboardSelect(null, data);
    } catch (error) {
      console.error(error);
    }
  };

  const onNewWidgetSave = (widgetData) => {
    if (!widgetData.project_id && primaryObject) {
      widgetData.project_id = primaryObject.id;
    }
    const postWidget = async (widgetData) => {
      try {
        const response = await HttpClient.post(
          [Settings.serverUrl, 'widget-config'],
          widgetData,
        );
        const savedWidget = await HttpClient.handleResponse(response);
        updateWidget(savedWidget); // Update widget in context
        setIsNewWidgetOpen(false); // Close modal after widget is saved
      } catch (error) {
        console.error(error);
      }
    };

    postWidget(widgetData);
  };

  const onEditWidgetSave = (editedData) => {
    if (!editedData.project_id && primaryObject) {
      editedData.project_id = primaryObject.id;
    }

    // Close modal before starting the async operation
    setIsEditModalOpen(false);

    const putWidget = async (editedData) => {
      try {
        const response = await HttpClient.put(
          [Settings.serverUrl, 'widget-config', currentWidget],
          '',
          editedData,
        );
        const updatedWidget = await HttpClient.handleResponse(response);

        // Include edited data since the server response may not include all params
        const completeWidgetData = {
          ...updatedWidget,
          id: currentWidget,
          params: {
            ...editedData.params, // Use the exact params from the edit form
            project: primaryObject?.id,
          },
        };

        // Update widget in context, this will trigger the useEffect in useWidgets
        // which will refresh all widgets with the latest data
        updateWidget(completeWidgetData);

        // After updating the widget in the context, force a complete refresh
        // with a slight delay to avoid race conditions
        setTimeout(() => {
          const refreshWidgets = async () => {
            try {
              const response = await HttpClient.get(
                [Settings.serverUrl, 'widget-config'],
                {
                  type: 'widget',
                  filter: `dashboard_id=${selectedDashboard?.id}`,
                },
              );
              const data = await HttpClient.handleResponse(response);
              const refreshedWidgets = data?.widgets.map((w) => ({
                ...w,
                params: {
                  ...w.params,
                  project: primaryObject?.id,
                },
              }));
              setWidgets(refreshedWidgets);
            } catch (refreshError) {
              console.error('Error refreshing widgets:', refreshError);
            }
          };
          refreshWidgets();
        }, 300); // Delay refresh to avoid race conditions
      } catch (error) {
        console.error('Error updating widget:', error);
      }
    };

    putWidget(editedData);
  };

  useEffect(() => {
    document.title = 'Dashboard | Ibutsu';
  }, []);

  const toggle = (toggleRef) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      aria-label="Typeahead menu toggle"
      onClick={() => {
        setIsDashboardOpen(!isDashboardOpen);
        selectInputRef?.current?.focus();
      }}
      isExpanded={isDashboardOpen}
      isFullWidth
      isDisabled={!primaryObject}
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={selectInputValue}
          onClick={() => {
            setIsDashboardOpen(!isDashboardOpen);
          }}
          onChange={onDashboardFilterInput}
          id="typeahead-select-input"
          autoComplete="off"
          placeholder={
            loading ? 'Loading Dashboards...' : 'No active dashboard'
          }
          role="combobox"
          isExpanded={isDashboardOpen}
          aria-controls="select-typeahead-listbox"
        />
        <TextInputGroupUtilities
          {...(!selectInputValue ? { style: { display: 'none' } } : {})}
        >
          <Button
            variant="plain"
            onClick={onDashboardClear}
            aria-label="Clear input value"
          >
            <TimesIcon aria-hidden />
          </Button>
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <React.Fragment>
      <PageSection variant={PageSectionVariants.light}>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <Flex>
            <FlexItem spacer={{ default: 'spacerLg' }}>
              <TextContent>
                <Text component="h1">Dashboard</Text>
              </TextContent>
            </FlexItem>
            <FlexItem
              id="dashboard-selector"
              spacer={{ default: 'spacerNone' }}
            >
              <Select
                id="typeahead-select"
                isScrollable={true}
                isOpen={isDashboardOpen}
                selected={selectedDashboard}
                onSelect={onDashboardSelect}
                onOpenChange={() => {
                  setIsDashboardOpen(false);
                }}
                toggle={toggle}
              >
                <SelectList id="select-typeahead-listbox" scrolling="true">
                  {filteredDashboards?.map((dash) => (
                    <SelectOption
                      key={dash.id}
                      onClick={() => {
                        setSelectedDashboard(dash);
                      }}
                      value={dash}
                    >
                      {dash.title}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FlexItem>
            <FlexItem spacer={{ default: 'spacerNone' }}>
              <Button
                aria-label="New dashboard"
                variant="plain"
                title="New dashboard"
                isDisabled={isDashboardOpen}
                onClick={() => {
                  setIsNewDBOpen(true);
                }}
              >
                <PlusCircleIcon />
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                aria-label="Delete dashboard"
                variant="plain"
                title="Delete dashboard"
                isDisabled={!selectedDashboard}
                onClick={() => {
                  setIsDeleteDBOpen(true);
                }}
              >
                <TimesCircleIcon />
              </Button>
            </FlexItem>
          </Flex>

          <Flex>
            <FlexItem>
              <Button
                aria-label="Add widget"
                variant="secondary"
                title="Add widget"
                isDisabled={!selectedDashboard}
                onClick={() => {
                  setIsNewWidgetOpen(true);
                }}
              >
                <PlusCircleIcon /> Add Widget
              </Button>
            </FlexItem>
          </Flex>
        </Flex>
      </PageSection>
      <PageSection>
        {!!primaryObject && !!selectedDashboard && !!widgets && (
          <Grid hasGutter>{widgetComponents}</Grid>
        )}
        {!!primaryObject && !selectedDashboard && (
          <EmptyState>
            <EmptyStateHeader
              titleText="No Dashboard Selected"
              icon={<EmptyStateIcon icon={TachometerAltIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>
              There is currently no dashboard selected. Please select a
              dashboard from the dropdown in order to view widgets, or create a
              new dashboard.
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="primary"
                onClick={() => {
                  setIsNewDBOpen(true);
                }}
              >
                New Dashboard
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        )}
        {!!primaryObject && !!selectedDashboard && widgets.length === 0 && (
          <EmptyState>
            <EmptyStateHeader
              titleText="No Widgets"
              icon={<EmptyStateIcon icon={CubesIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>
              This dashboard currently has no widgets defined.
              <br />
              Click on the &quot;Add Widget&quot; button below to add a widget
              to this dashboard.
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="primary"
                onClick={() => {
                  setIsNewWidgetOpen(true);
                }}
              >
                Add Widget
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        )}
      </PageSection>
      <NewDashboardModal
        project={primaryObject}
        saveCallback={(newDashboard) => onNewDashboardSave(newDashboard)}
        closeCallback={() => {
          setIsNewDBOpen(false);
        }}
        isOpen={isNewDBOpen}
      />
      <NewWidgetWizard
        dashboard={selectedDashboard}
        isOpen={isNewWidgetOpen}
        saveCallback={onNewWidgetSave}
        closeCallback={() => {
          setIsNewWidgetOpen(false);
        }}
      />
      <DeleteModal
        title="Delete Dashboard"
        body={
          <>
            Would you like to delete the current dashboard?{' '}
            <strong>ALL WIDGETS</strong> on the dashboard will also be deleted.{' '}
            <br /> <strong>This action cannot be undone.</strong>
          </>
        }
        isOpen={isDeleteDBOpen}
        onDelete={onDashboardClear}
        onClose={() => {
          setIsDeleteDBOpen(false);
        }}
        toDeletePath={['dashboard']}
        toDeleteId={selectedDashboard?.id}
      />
      <DeleteModal
        title="Delete widget"
        body="Would you like to delete the selected widget?"
        isOpen={isDeleteWidgetOpen}
        onClose={() => {
          setIsDeleteWidgetOpen(false);
        }}
        onDelete={() => {
          deleteWidget(currentWidget);
        }}
        toDeletePath={['widget-config']}
        toDeleteId={currentWidget}
      />
      {isEditModalOpen ? (
        <EditWidgetModal
          isOpen={isEditModalOpen}
          onSave={onEditWidgetSave}
          onClose={() => {
            setIsEditModalOpen(false);
          }}
          data={editWidgetData}
        />
      ) : (
        ''
      )}
    </React.Fragment>
  );
};

const Dashboard = (props) => {
  return (
    <WidgetProvider>
      <DashboardContent {...props} />
    </WidgetProvider>
  );
};

Dashboard.propTypes = {};

export default Dashboard;
