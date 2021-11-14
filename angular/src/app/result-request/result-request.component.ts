import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { Title } from '@angular/platform-browser';
import { EventEmitterService } from'../event-emitter.service';

@Component({
  selector: 'app-result-request',
  templateUrl: './result-request.component.html',
  styleUrls: ['./result-request.component.css']
})
export class ResultRequestComponent implements OnInit {

  @Input() resultRequest;
  @Output() resultRequestChange = new EventEmitter<any>();
  @Input() use;


  constructor(
    public api: ApiService,
    public storage: LocalStorageService,
    public title: Title,
    public events: EventEmitterService
  ) { }

  ngOnInit(){
    if(this.resultRequest.haveSentFriendRequest) { this.haveSentFriendRequest = true; }
    if(this.resultRequest.haveRecievedFriendRequest) { this.haveRecievedFriendRequest = true; }
    if(this.resultRequest.isFriend) { this.isFriend = true; }
  }

  public accept() {
    this.updateRequests();
    this.api.resolveFriendRequest("accept", this.resultRequest._id).then((val)=>{
      console.log(val);
    });

  }
  public decline() {
    this.updateRequests();
    this.api.resolveFriendRequest("decline", this.resultRequest._id).then((val)=>{
      console.log(val);
    });
  }

  private updateRequests() {
    this.resultRequestChange.emit(this.resultRequest._id);
  }

  public updateSendMessageObject(id, name) {
    this.events.updateSendMessageObjectEvent.emit({ id: id, name: name});
  }

  public haveSentFriendRequest: boolean = false;
  public haveRecievedFriendRequest: boolean = false;
  public isFriend: boolean = false;
}
