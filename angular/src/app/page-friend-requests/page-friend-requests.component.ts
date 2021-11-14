import { Component, OnInit, Inject } from '@angular/core';
import { ApiService } from '../api.service';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { AutoUnsubscribe } from '../unsubscribe';
import { EventEmitterService } from'../event-emitter.service';

@Component({
  selector: 'app-page-friend-requests',
  templateUrl: './page-friend-requests.component.html',
  styleUrls: ['./page-friend-requests.component.css']
})
@AutoUnsubscribe
export class PageFriendRequestsComponent implements OnInit {

  constructor(
    public api: ApiService,
    public title: Title,
    public events: EventEmitterService,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  ngOnInit(){
    this.title.setTitle("Friend Requests");
    this.document.getElementById("sidebarToggleTop").classList.add("d-none");

    let userDataEvent = this.events.getUserData.subscribe((data)=>{
      this.userData = data;

      let array = JSON.stringify(data.friend_requests);

      let requestObject = {
        location: `users/get-friend-requests?friend_requests=${array}`,
        type: "GET",
        authorize: true
      }

      this.api.makeRequest(requestObject).then((val) =>{
        if(val.statusCode === 200) {
          this.friendRequests = val.users;
        }
      });

    });

    this.subscriptions.push(userDataEvent);
  }

  public userData: object = {};
  public friendRequests = [];
  private subscriptions = [];

  public updateFriendRequests(id) {

    let arr = this.friendRequests;

    for(let i = 0; i < arr.length; i++) {
      if(arr[i]._id == id) {
        arr.splice(i,1);
        break;
      }
    }

  }
}
