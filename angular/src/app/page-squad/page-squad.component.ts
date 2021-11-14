import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';

@Component({
    selector: 'app-page-squad',
    templateUrl: './page-squad.component.html',
    styleUrls: ['./page-squad.component.css']
})
export class PageSquadComponent implements OnInit {


    constructor(
        public api: ApiService,
        public storage: LocalStorageService
    ) { }

    ngOnInit(){

        let requestObject = {
            location: 'users/generate-squad-feed',
            type: "GET",
            authorize: true
        }

        this.api.makeRequest(requestObject).then((val) => {
            console.log(val);
            if(val.statusCode == 201) {
                this.arrOfSquads.push(val.squads);
            }

            console.log(this.arrOfSquads);

            this.arrOfSquads = this.arrOfSquads[0][0];
            console.log(this.arrOfSquads);
            console.log(this.arrOfSquads.length);
            for(let i = this.arrOfSquads.length - 1;i>=0; i--) {
                this.finalSquads[0].push(this.arrOfSquads[i].squad);
                this.finalSquads[1].push(this.arrOfSquads[i].speciality);
            }
            console.log(this.finalSquads[0]);
            console.log(this.finalSquads[1]);

            for(let i in this.finalSquads[0]) {
                this.squads.push([this.finalSquads[0][i]])
            }

            for(let j in this.finalSquads[1]) {
                this.squads[j].push(this.finalSquads[1][j]);
            }

            console.log(this.squads);

        });


    }

    public arrOfSquads = [];

    public squads = [];

    public finalSquads = [[],[]]


    public newCredentials:object = {}

    public credentials = {
        squad: "",
        speciality: ""
    }

    public createSquad() {

        let requestObject = {
            location: 'users/create-squad',
            type: "POST",
            body: this.credentials,
            authorize: true
        }

        this.api.makeRequest(requestObject).then((val) => {
            console.log(val);
            if(val.statusCode == 201) {
                this.arrOfSquads.unshift(val.squads);
            }
            this.credentials.squad = "";
            this.credentials.speciality = "";
            console.log(this.arrOfSquads);
        });
    }



}
