import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepagePage } from './home.page';

describe('HomepagePage', () => {
  let component: HomepagePage;
  let fixture: ComponentFixture<HomepagePage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HomepagePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
