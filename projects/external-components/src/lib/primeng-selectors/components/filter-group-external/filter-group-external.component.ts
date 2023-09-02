import { Component, OnDestroy, Renderer2 } from '@angular/core';
import { CommonExternalComponent } from '../common-external/common-external.component';

export const FilterEventType = {
  DEPENDENT: 'dependent',
  TEXT: 'text',
  DROPDOWN: 'dropdown'
};

export interface IFilterGroup {
  label: string;
  type: string;
  value: string;
  show: boolean;
  labelKey?: string;
  valueKey?: string;
  filterApplied?: boolean;
  optionList?: any[];
  dependentList?: IFilterGroup[];
  pillLabel: string;
  showLoader: boolean;
}

@Component({
  selector: 'hmi-ext-filter-group',
  templateUrl: './filter-group-external.component.html',
  styleUrls: ['./filter-group-external.component.scss']
})
export class FilterGroupExternalComponent extends CommonExternalComponent implements OnDestroy {
  showPopup: boolean;
  items: any[];
  private unlistener: any;
  showSubMenuOption: boolean;
  currentEventConfig: any;
  filterLoader: boolean;

  constructor(private renderer2: Renderer2) { 
    super();
    this.showPopup = false;
    this.showSubMenuOption = false;
    this.items = [];
    this.filterLoader = false;
  }

  filterFormGrp : IFilterGroup[] = [];
  appliedFilterPills: IFilterGroup[] = [];
  initializeFilterFormGrp() {
    this.filterFormGrp = this.fieldObj.customAttributes?.filterOptions?.map((v: any)=> {
      const data = { ...v, show: false };
      if (v.type === FilterEventType.DEPENDENT) {
        const dependentList = v.dependentList.map((dep:any)=> ({ ...dep, value: '' }))
        return {...data, dependentList}
      }
      return data;
    });
    console.info('filterFormGrp ',this.filterFormGrp)
  }

  hideFilterFormGrp() {
    this.filterFormGrp = this.filterFormGrp.map(v=> ({...v, show: false}))
  }

  handleShowPopup() {
    this.showPopup = true;
    this.unlistener = this.renderer2.listen("document", "click", event => {
        if (!(event.target.id === ("filter-menu-popup-" + this.fieldObj.baseProperties?.id) 
          || event.target.closest("#filter-menu-popup-" + this.fieldObj.baseProperties?.id)
          || event.target.id === ("filter-group-btn-" + this.fieldObj.baseProperties?.id) 
          || event.target.closest("#filter-group-btn-" + this.fieldObj.baseProperties?.id)
          || event.target.id === ("filter-menu-subpopup-" + this.fieldObj.baseProperties?.id) 
          || event.target.closest("#filter-menu-subpopup-" + this.fieldObj.baseProperties?.id))) {
            this.closePopup();
        }
    });
  }

  closePopup() {
    this.showPopup = false;
    this.showSubMenuOption = false;
    this.unlistener();
  }

  ngOnInit() {
    this.initializeFilterFormGrp();

    this.subscription = this.fieldObj.action.subscribe((actionObj: any) => {
      if (actionObj.actionType === "CLEAR_COMPONENT_DATA") {
        this.filterFormGrp.forEach((filter: IFilterGroup) => {
          filter.filterApplied = false;
        })
        this.updateFilterPill();
      } else if (actionObj.actionType === "RELOAD_COMPONENT_DATA") {
        this.applyFilter();
      } 
    });

    this.items = this.fieldObj.customAttributes?.filterOptions?.map((item: any, index:number) => {
      item.command = () => {
        this.hideFilterFormGrp();
        const filterObj = this.filterFormGrp[index];
        switch(item.type.toLowerCase()) {
          case FilterEventType.DEPENDENT:            
            filterObj.show = true;
            if(filterObj.dependentList && filterObj.dependentList.length) {
              this.loadDropdownDataFromAPI((filterObj.dependentList[0]) || []);
            }
            break;
          case FilterEventType.TEXT:
            filterObj.show = true;
            break;
          case FilterEventType.DROPDOWN:
            filterObj.show = true;
            this.loadDropdownDataFromAPI(item);
            break;
        }
        this.showSubMenuOption = true;
        console.info('filterFormGrp ',this.filterFormGrp)
      }
      return item;
    }); 
  }

  loadDropdownDataFromAPI(ddOption: any) {
    if (ddOption.optionsConfig && ddOption.optionsConfig.fetch === "ONLOAD") {
      this.loadData(ddOption);
    }
  }

  loadData(ddOption: any, selectedValue?: string) {
    ddOption.showLoader = true;   
    this.customApiCall(ddOption.optionsConfig).subscribe((data: any[]) => {
      ddOption.optionList = data;
      if (data && data.length && ddOption.filterOptionListBy) {
        ddOption.optionList = ddOption.optionList.filter((v:any)=> v[ddOption.filterOptionListBy] === selectedValue);
      }
    }, ((err: any) => {
      ddOption.optionList = [];
      console.error(err);
    }), (() => {
      ddOption.showLoader = false;
    }));
  }

  closeSubMenuPopup() {
    this.showSubMenuOption = false;
  }

  changeDependentDropdown(index: number, selectedValue: any,list: any[]) {
    if (list[index + 1]?.optionsConfig) {
      this.clearOtherDependentDropdown(list, index + 2);
      this.loadData(list[index + 1], selectedValue);
    }
  }

  clearOtherDependentDropdown(list: any[], index: number) {
    for (; index < list.length; index++) {
      list[index].optionList = [];
    }
  }

  updateFilterPill() {
    this.appliedFilterPills = JSON.parse(JSON.stringify(this.filterFormGrp));
  }

  getFilterPillValue(filter: IFilterGroup): IFilterGroup {
    filter.pillLabel = "";
    if (filter.type === 'dependent') {
      filter.dependentList?.forEach(((depF: IFilterGroup) => {
        filter.pillLabel += depF.label + ": " + depF.value + ", ";
      }));
      if (filter.pillLabel.length >=2 && filter.pillLabel[filter.pillLabel.length - 2] === ", ") {
        filter.pillLabel = filter.pillLabel.slice(0, filter.pillLabel.length - 2);
      }
    } else {
      filter.pillLabel += filter.label + ": " + filter.value;
    }
    return filter;
  }

  applyTextEvent(filterObj: IFilterGroup) {
    filterObj.filterApplied = true;
    this.closePopup();
    this.applyFilter();
  }

  applyDropdownEvent(filterObj: IFilterGroup) {
    filterObj.filterApplied = true;
    this.closePopup();
    this.applyFilter();
  }

  applyDependentEvent(filterObj: IFilterGroup) {
    filterObj.filterApplied = true;
    this.closePopup();
    this.applyFilter();
  }

  prepareData(): any[] {
    let data: any = {};
    this.filterFormGrp.forEach((filter: IFilterGroup) => {
      if(filter.filterApplied) {
        if (filter.type === 'dependent') {
          filter.dependentList?.forEach(((depF: IFilterGroup) => {
            if (depF.valueKey) {
              data[depF.valueKey] = depF.value;
            }
          }));
        } else {
          if (filter.valueKey) {
            data[filter.valueKey] = filter.value;
          }
        }
      }
    });
    return data;
  }

  applyFilter() {
    this.filterLoader = true;
    const data = this.prepareData(),
          config = JSON.parse(JSON.stringify(this.fieldObj.customAttributes?.filterConfig));
    config.queryParams = this.filterParams(config.queryParams, data);
    config.pathParams = this.filterParams(config.pathParams, data);
    config.payloadParams = this.filterParams(config.payloadParams, data);
    
    this.customApiCall(config, data).subscribe((data: any[]) => {
      this.updateFilterPill();  
    }, ((err: any) => {
      console.error(err);
    }), (() => {
      this.filterLoader = false;
    }));
  }

  filterParams(params: any, data: any): any[] {
    return params?.length ? params.filter((param: any) => !!data[param.mappedValue]) : [];
  }

  removeFilter(filter: IFilterGroup, index: number) {
    filter.filterApplied = false;
    this.filterFormGrp[index].filterApplied = false;
    this.applyFilter();
  }

  ngOnDestroy(): void {
    this.unlistener();
  }
}