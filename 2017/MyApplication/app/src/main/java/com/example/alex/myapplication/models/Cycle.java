package com.example.alex.myapplication.models;


public class Cycle extends Biot {

    private String relayId;

    public Cycle(String name, int tempsOff, int tempsOn) {
        this.name = name;
        this.tempsOff = tempsOff;
        this.tempsOn = tempsOn;
    }

    public Cycle(String name, int tempsOff, int tempsOn, String relayId) {
        this.name = name;
        this.tempsOff = tempsOff;
        this.tempsOn = tempsOn;
        this.relayId = relayId;
    }

    private String name;
    private int tempsOn;
    private int tempsOff;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getTempsOn() {
        return tempsOn;
    }

    public void setTempsOn(int tempsOn) {
        this.tempsOn = tempsOn;
    }

    public int getTempsOff() {
        return tempsOff;
    }

    public void setTempsOff(int tempsOff) {
        this.tempsOff = tempsOff;
    }

    public String toString() {
        return "Cycle: " + name + " off: " + tempsOff + " on: " + tempsOn;
    }

    public String getRelayId() {
        return relayId;
    }

    public void setRelayId(String relayId) {
        this.relayId = relayId;
    }
}
