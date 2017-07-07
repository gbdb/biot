package com.example.alex.myapplication.communication;

public class Action {

    private String name;
    private int httpMethod;
    String id;

    public Action(String name) {
        this.name = name;
    }

    public Action(String name, int httpMethod) {
        this.httpMethod = httpMethod;
        this.name = name;
    }

    public Action(String id,String name, int httpMethod) {
        this.name = name + id;
        this.httpMethod = httpMethod;
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(int httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }
}
