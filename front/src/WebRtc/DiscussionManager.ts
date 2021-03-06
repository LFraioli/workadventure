import {HtmlUtils} from "./HtmlUtils";
import {MediaManager, ReportCallback, UpdatedLocalStreamCallback} from "./MediaManager";
import {UserInputManager} from "../Phaser/UserInput/UserInputManager";
import {connectionManager} from "../Connexion/ConnectionManager";
import {GameConnexionTypes} from "../Url/UrlManager";

export type SendMessageCallback = (message:string) => void;

export class DiscussionManager {
    private mainContainer: HTMLDivElement;

    private divDiscuss?: HTMLDivElement;
    private divParticipants?: HTMLDivElement;
    private nbpParticipants?: HTMLParagraphElement;
    private divMessages?: HTMLParagraphElement;
    private buttonActiveDiscussion?: HTMLButtonElement;

    private participants: Map<number|string, HTMLDivElement> = new Map<number|string, HTMLDivElement>();

    private activeDiscussion: boolean = false;

    private sendMessageCallBack : Map<number|string, SendMessageCallback> = new Map<number|string, SendMessageCallback>();

    private userInputManager?: UserInputManager;

    constructor(private mediaManager: MediaManager, name: string) {
        this.mainContainer = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        this.createDiscussPart(name);
    }

    private createDiscussPart(name: string) {
        this.divDiscuss = document.createElement('div');
        this.divDiscuss.classList.add('discussion');

        const buttonCloseDiscussion: HTMLButtonElement = document.createElement('button');
        this.buttonActiveDiscussion = document.createElement('button');
        buttonCloseDiscussion.classList.add('close-btn');
        buttonCloseDiscussion.innerHTML = `<img src="resources/logos/close.svg"/>`;
        buttonCloseDiscussion.addEventListener('click', () => {
            this.hideDiscussion();
            this.showButtonDiscussionBtn();
        });
        this.buttonActiveDiscussion.classList.add('active-btn');
        this.buttonActiveDiscussion.innerHTML = `<img src="resources/logos/discussion.svg"/>`;
        this.buttonActiveDiscussion.addEventListener('click', () => {
            this.showDiscussionPart();
        });
        this.divDiscuss.appendChild(buttonCloseDiscussion);
        this.divDiscuss.appendChild(this.buttonActiveDiscussion);

        const myName: HTMLParagraphElement = document.createElement('p');
        myName.innerText = name.toUpperCase();
        this.nbpParticipants = document.createElement('p');
        this.nbpParticipants.innerText = 'PARTICIPANTS (1)';

        this.divParticipants = document.createElement('div');
        this.divParticipants.classList.add('participants');

        this.divMessages = document.createElement('div');
        this.divMessages.classList.add('messages');
        this.divMessages.innerHTML = "<h2>Local messages</h2>"

        this.divDiscuss.appendChild(myName);
        this.divDiscuss.appendChild(this.nbpParticipants);
        this.divDiscuss.appendChild(this.divParticipants);
        this.divDiscuss.appendChild(this.divMessages);

        const sendDivMessage: HTMLDivElement = document.createElement('div');
        sendDivMessage.classList.add('send-message');
        const inputMessage: HTMLInputElement = document.createElement('input');
        inputMessage.type = "text";
        inputMessage.addEventListener('keyup', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if(inputMessage.value === null
                    || inputMessage.value === ''
                    || inputMessage.value === undefined) {
                    return;
                }
                this.addMessage(name, inputMessage.value, true);
                for(const callback of this.sendMessageCallBack.values()) {
                    callback(inputMessage.value);
                }
                inputMessage.value = "";
            }
        });
        sendDivMessage.appendChild(inputMessage);
        this.divDiscuss.appendChild(sendDivMessage);

        //append in main container
        this.mainContainer.appendChild(this.divDiscuss);

        this.addParticipant('me', 'Moi', undefined, true);
    }

    public addParticipant(
        userId: number|string,
        name: string|undefined,
        img?: string|undefined,
        isMe: boolean = false,
        reportCallback?: ReportCallback
    ) {
        const divParticipant: HTMLDivElement = document.createElement('div');
        divParticipant.classList.add('participant');
        divParticipant.id = `participant-${userId}`;

        const divImgParticipant: HTMLImageElement = document.createElement('img');
        divImgParticipant.src = 'resources/logos/boy.svg';
        if (img !== undefined) {
            divImgParticipant.src = img;
        }
        const divPParticipant: HTMLParagraphElement = document.createElement('p');
        if(!name){
            name = 'Anonymous';
        }
        divPParticipant.innerText = name;

        divParticipant.appendChild(divImgParticipant);
        divParticipant.appendChild(divPParticipant);

        if(
            !isMe
            && connectionManager.getConnexionType
            && connectionManager.getConnexionType !== GameConnexionTypes.anonymous
        ) {
            const reportBanUserAction: HTMLButtonElement = document.createElement('button');
            reportBanUserAction.classList.add('report-btn')
            reportBanUserAction.innerText = 'Report';
            reportBanUserAction.addEventListener('click', () => {
                if(reportCallback) {
                    this.mediaManager.showReportModal(`${userId}`, name ?? '', reportCallback);
                }else{
                    console.info('report feature is not activated!');
                }
            });
            divParticipant.appendChild(reportBanUserAction);
        }

        this.divParticipants?.appendChild(divParticipant);

        this.participants.set(userId, divParticipant);
        this.showButtonDiscussionBtn();

        this.updateParticipant(this.participants.size);
    }

    public updateParticipant(nb: number) {
        if (!this.nbpParticipants) {
            return;
        }
        this.nbpParticipants.innerText = `PARTICIPANTS (${nb})`;
    }

    public addMessage(name: string, message: string, isMe: boolean = false) {
        const divMessage: HTMLDivElement = document.createElement('div');
        divMessage.classList.add('message');
        if(isMe){
            divMessage.classList.add('me');
        }

        const pMessage: HTMLParagraphElement = document.createElement('p');
        const date = new Date();
        if(isMe){
            name = 'Moi';
        }
        pMessage.innerHTML = `<span style="font-weight: bold">${name}</span>    
                    <span style="color:#bac2cc;display:inline-block;font-size:12px;">
                        ${date.getHours()}:${date.getMinutes()}
                    </span>`;
        divMessage.appendChild(pMessage);

        const userMessage: HTMLParagraphElement = document.createElement('p');
        userMessage.innerText = message;
        userMessage.classList.add('body');
        divMessage.appendChild(userMessage);

        this.divMessages?.appendChild(divMessage);
    }

    public removeParticipant(userId: number|string){
        const element = this.participants.get(userId);
        if(element){
            element.remove();
            this.participants.delete(userId);
        }
        //if all participant leave, hide discussion button
        if(this.participants.size === 1){
            this.hideButtonDiscussionBtn();
        }

        this.sendMessageCallBack.delete(userId);
    }

    public onSendMessageCallback(userId: string|number, callback: SendMessageCallback): void {
        this.sendMessageCallBack.set(userId, callback);
    }

    get activatedDiscussion(){
        return this.activeDiscussion;
    }

    private showButtonDiscussionBtn(){
        //if it's first participant, show discussion button
        if(this.activatedDiscussion || this.participants.size === 1) {
            return;
        }
        this.buttonActiveDiscussion?.classList.add('active');
    }

    private showDiscussion(){
        this.activeDiscussion = true;
        if(this.userInputManager) {
            this.userInputManager.clearAllInputKeyboard();
        }
        this.divDiscuss?.classList.add('active');
    }

    private hideDiscussion(){
        this.activeDiscussion = false;
        if(this.userInputManager) {
            this.userInputManager.initKeyBoardEvent();
        }
        this.divDiscuss?.classList.remove('active');
    }

    private hideButtonDiscussionBtn(){
        this.buttonActiveDiscussion?.classList.remove('active');
    }

    public setUserInputManager(userInputManager : UserInputManager){
        this.userInputManager = userInputManager;
    }

    public showDiscussionPart(){
        this.showDiscussion();
        this.hideButtonDiscussionBtn();
    }
}