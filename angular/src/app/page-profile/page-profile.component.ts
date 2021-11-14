import { Component, OnInit, Inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { ApiService } from '../api.service';
import { AutoUnsubscribe } from '../unsubscribe';
import { EventEmitterService } from'../event-emitter.service';


@Component({
  selector: 'app-page-profile',
  templateUrl: './page-profile.component.html',
  styleUrls: ['./page-profile.component.css']
})
@AutoUnsubscribe
export class PageProfileComponent implements OnInit {

  constructor(
    public title: Title,
    public api: ApiService,
    public route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
    public events: EventEmitterService
  ) { }

  ngOnInit(){
    this.title.setTitle("Profile");
    this.document.getElementById("sidebarToggleTop").classList.add("d-none");


    let paramId = this.route.snapshot.params.userid;
    let userDataEvent = this.events.getUserData.subscribe((user)=>{

      this.besties = user.besties;
      this.enemies = user.enemies;

      this.route.params.subscribe((params)=>{
        this.showPosts = 6;

        this.isBestie = user.besties.some((v)=>(v._id == params.userid));
        this.isEnemy = user.enemies.some((v)=>(v._id == params.userid));

        this.maxAmountOfBesties = user.besties.length>=2;

        if(":"+user._id == params.userid) {
          this.setComponentValues(user);
          this.resetBooleans();
        } else {
          this.canSendMessage = true;
          let requestObject = {
            location: `users/get-user-data/${params.userid}`,
            type: "GET"
          }
          this.api.makeRequest(requestObject).then((data)=>{


            if(data.statusCode == 200) {

              this.canAddUser = user.friend.includes(data.user._id) ? false : true;
              this.haveRecievedFriendRequest = user.friend_requests.includes(data.user._id);
              this.haveSentFriendRequest = data.user.friend_requests.includes(user._id) ? true: false;

              if(this.canAddUser) { this.showPosts = 0; }

              this.setComponentValues(data.user);
            }

          });

        }

      });
    });

    this.subscriptions.push(userDataEvent);
  }

  public randomFriends: string[] = [];
  public totalFriends: number = 0;
  public posts: object[] = [];
  public showPosts: number = 6;
  public profilePicture: string = "default-avatar";
  public userName: string = "";
  public usersEmail: string = "";
  public usersId: string = "";

  public haveSentFriendRequest: boolean = false;
  public haveRecievedFriendRequest: boolean = false;

  public maxAmountOfBesties: boolean = false;
  public isBestie: boolean = false;
  public isEnemy: boolean = false;

  public besties = [];
  public enemies = [];




  private subscriptions = [];

  public canAddUser: boolean = false;
  public canSendMessage: boolean = false;

  public showMorePosts() {
    this.showPosts += 6;
  }
  public backToTop() {
    this.document.body.scrollTop = this.document.documentElement.scrollTop = 0;
  }

  public setComponentValues(user){
    this.randomFriends = user.random_friends;
    this.profilePicture = user.profile_image;
    this.posts = user.posts;
    this.userName = user.name;
    this.usersEmail = user.email;
    this.totalFriends = user.friend.length;
    this.usersId = user._id;
  }

  public accept(){
    this.api.resolveFriendRequest("accept", this.usersId).then((val: any)=>{
      if(val.statusCode === 201) {
        this.haveRecievedFriendRequest = false;
        this.canAddUser = false;
        this.totalFriends++;
        this.showPosts = 6;
      }
    });
  }
  public decline(){
    this.api.resolveFriendRequest("decline", this.usersId).then((val: any)=>{
      if(val.statusCode == 201) {
        this.haveRecievedFriendRequest = false;
      }
    });
  }

  public makeFriendRequest() {
    this.api.makeFriendRequest(this.usersId).then((val: any)=>{
      if(val.statusCode == 201) { this.haveSentFriendRequest =true; }
    });
  }

  public resetBooleans(){
    this.canAddUser = false;
    this.canSendMessage = false;
    this.haveSentFriendRequest = false;
    this.haveRecievedFriendRequest = false;
    this.isBestie = false;
    this.isEnemy = false;
    this.maxAmountOfBesties = false;
  }

  public updateSendMessageObject(id, name) {
    this.events.updateSendMessageObjectEvent.emit({ id, name });
  }



  public toggleRequest(toggle) {

    function toggleValue(array) {
      for(let i=0; i<array.length; i++) {
        if(array[i]._id == this.usersId) {
          return array.splice(i, 1);
        }
      }
      array.push({ _id: this.usersId });
    }

    let requestObject = {
      location: `users/bestie-enemy-toggle/${ this.usersId }?toggle=${toggle}`,
      type: "POST"
    }

    this.api.makeRequest(requestObject).then((val)=>{
      if(val.statusCode == 201) {
        if(toggle == "besties") {
          toggleValue.call(this, this.besties);
          this.maxAmountOfBesties = this.besties.length >= 2;
          this.isBestie = !this.isBestie;
        } else {
          toggleValue.call(this, this.enemies);
          this.isEnemy = !this.isEnemy
        }
      }
    });
  }




}
