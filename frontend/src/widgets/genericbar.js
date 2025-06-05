import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartContainer,
  ChartLegend,
  ChartStack,
  ChartTooltip,
} from '@patternfly/react-charts';
import {
  Card,
  CardBody,
  CardFooter,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Text,
} from '@patternfly/react-core';

import { HttpClient } from '../services/http';
import { Settings } from '../settings';
import { toTitleCase } from '../utilities';
import WidgetHeader from '../components/widget-header';
import ParamDropdown from '../components/param-dropdown';
import { CHART_COLOR_MAP, CHART_THEME } from '../constants';

const SIZE_FAMILY = {
  fontSize: CHART_THEME.fontSize.small,
  fontFamily: CHART_THEME.fontFamily.base,
};

const GenericBarWidget = ({
  barWidth = 30,
  dropdownItems = ['component', 'env', 'metadata.jenkins.job_name'],
  height,
  hideDropdown,
  horizontal,
  padding = {
    bottom: 30,
    left: 30,
    right: 10,
    top: 40,
  },
  params = {},
  percentData,
  sortOrder = 'descending',
  title = 'Recent Run Results',
  widgetEndpoint = 'run-aggregator',
  xLabel = '',
  xLabelTooltip,
  yLabel = '',
  onDeleteClick,
  onEditClick,
}) => {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [genericBarError, setGenericBarError] = useState(false);
  const [groupField, setGroupField] = useState(params.group_field);
  const [weeks, setWeeks] = useState(params.weeks);

  useEffect(() => {
    const fetchJobData = async () => {
      setIsLoading(true);
      try {
        const response = await HttpClient.get(
          [Settings.serverUrl, 'widget', widgetEndpoint],
          params,
        );
        const responseData = await HttpClient.handleResponse(response);

        setData(responseData);
        setIsLoading(false);
      } catch (error) {
        setGenericBarError(true);
        console.error(error);
      }
    };
    if (widgetEndpoint && Object.keys(params).length) {
      const debouncer = setTimeout(() => {
        fetchJobData();
      }, 50);
      return () => clearTimeout(debouncer);
    }
  }, [widgetEndpoint, params]);

  const legendData = useMemo(() => {
    console.log('Generating legend data: ', data);
    return Object.keys(data || {}).map((key) => ({
      name: toTitleCase(key),
      symbol: {
        fill: CHART_COLOR_MAP[key] || CHART_COLOR_MAP.default,
      },
      style: SIZE_FAMILY,
    }));
  }, [data]);

  const barCharts = useMemo(() => {
    const chartArray = [];

    const getLabels = () => {
      if (percentData) {
        return ({ datum }) => `${toTitleCase(datum.name)}: ${datum.y} %`;
      } else {
        if (xLabelTooltip) {
          return ({ datum }) =>
            `${xLabelTooltip}: ${datum.x} \n ${toTitleCase(datum.name)}: ${datum.y}`;
        } else {
          return ({ datum }) => `${toTitleCase(datum.name)}: ${datum.y}`;
        }
      }
    };

    for (const test_state of Object.keys(data)) {
      if (test_state !== 'filter') {
        const barData = [];
        for (const group_field of Object.keys(data[test_state])) {
          barData.push({
            name: toTitleCase(test_state),
            x: group_field,
            y: data[test_state][group_field],
          });
        }
        if (barData.length !== 0) {
          chartArray.push(
            <ChartBar
              responsive
              containerComponent={<ChartContainer responsive />}
              alignment="middle"
              key={test_state}
              data={barData}
              legendData={legendData}
              style={{
                data: {
                  fill: CHART_COLOR_MAP[test_state] || CHART_COLOR_MAP.default,
                },
                labels: SIZE_FAMILY,
              }}
              sortKey={(datum) => `${datum.x}`}
              sortOrder={sortOrder}
              horizontal={horizontal}
              labels={getLabels()}
              labelComponent={
                <ChartTooltip
                  dx={horizontal ? -10 : 0}
                  dy={horizontal ? 0 : -10}
                  style={{
                    fill: 'white',
                    ...SIZE_FAMILY,
                  }}
                />
              }
            />,
          );
        }
      }
    }
    return chartArray;
  }, [percentData, xLabelTooltip, data, legendData, sortOrder, horizontal]);

  const chartHeight = useMemo(() => {
    if (height) {
      return height;
    } else if (horizontal) {
      const numBars = Object.keys(data['passed']).length;
      return Math.max(numBars * 30, 300);
    } else {
      return 200;
    }
  }, [data, height, horizontal]);

  const getDropdowns = useMemo(() => {
    if (hideDropdown) {
      return null;
    } else {
      return (
        <div>
          <ParamDropdown
            dropdownItems={dropdownItems}
            defaultValue={groupField}
            handleSelect={(value) => setGroupField(value)}
            tooltip="Group data by:"
          />
          <ParamDropdown
            dropdownItems={[1, 2, 3, 4, 5, 6]}
            handleSelect={(value) => setWeeks(value)}
            defaultValue={weeks}
            tooltip="Set weeks to:"
          />
        </div>
      );
    }
  }, [dropdownItems, groupField, hideDropdown, weeks]);

  return (
    <Grid>
      <GridItem span={12}>
        <Card>
          <WidgetHeader
            title={title}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
          />
          <CardBody data-id="recent-runs">
            {genericBarError && <p>Error fetching data</p>}
            {!genericBarError && isLoading && (
              <Text component="h2">Loading ...</Text>
            )}
            {!genericBarError && !isLoading && (
              <Chart
                domainPadding={horizontal ? { x: 20 } : { y: 20 }}
                padding={padding}
                height={chartHeight}
                containerComponent={<ChartContainer responsive />}
                legendData={legendData}
                legendPosition="bottom"
                legendAllowWrap={true}
              >
                <ChartAxis
                  label={xLabel}
                  style={{
                    tickLabels: SIZE_FAMILY,
                    axisLabel: SIZE_FAMILY,
                  }}
                />
                <ChartAxis
                  label={yLabel}
                  dependentAxis
                  style={{
                    tickLabels: SIZE_FAMILY,
                    axisLabel: SIZE_FAMILY,
                  }}
                />
                <ChartStack>{barCharts}</ChartStack>
              </Chart>
            )}
          </CardBody>
          <CardFooter>
            <Flex>
              <FlexItem>
                <ChartLegend
                  containerComponent={<ChartContainer responsive />}
                  orientation="horizontal"
                  style={{
                    labels: SIZE_FAMILY,
                  }}
                />
              </FlexItem>
              <FlexItem>{getDropdowns}</FlexItem>
            </Flex>
          </CardFooter>
        </Card>
      </GridItem>
    </Grid>
  );
};

GenericBarWidget.propTypes = {
  barWidth: PropTypes.number,
  dropdownItems: PropTypes.array,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  hideDropdown: PropTypes.bool,
  horizontal: PropTypes.bool,
  onDeleteClick: PropTypes.func,
  onEditClick: PropTypes.func,
  padding: PropTypes.object,
  params: PropTypes.object,
  percentData: PropTypes.bool,
  sortOrder: PropTypes.string,
  title: PropTypes.string,
  widgetEndpoint: PropTypes.string,
  xLabel: PropTypes.string,
  xLabelTooltip: PropTypes.string,
  yLabel: PropTypes.string,
};

export default GenericBarWidget;
