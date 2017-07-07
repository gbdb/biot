package com.example.alex.myapplication.models;


public class Relay extends Biot {

    private String name;
    private boolean status;
    private String id;

    private Cycle cycle;

    private String currentCycleId;

    public String getCurrentCycleId() {return currentCycleId;}

    public Relay(String name, String id, boolean status) {
        this.name = name;
        this.id = id;
        this.status = status;
    }

    public Relay(String name, String id, boolean status, Cycle cycle) {
        this.name = name;
        this.id = id;
        this.cycle = cycle;
        this.status = status;
    }

    public String toString() {
        return "Name: " + name + " Status: " + status;
    }

    public boolean isStatus() {
        return status;
    }

    public void setStatus(boolean status) {
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Cycle getCycle() {
        return cycle;
    }

    public void setCycle(Cycle cycle) {
        this.cycle = cycle;
    }
}