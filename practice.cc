#include<iostream>
using namespace std;
int max (int a,int b)
{
    return a>b?a:b;
}
int dp[5][10];
int recurse (int* val,int *wt,int ind,int W)
{
    if (ind == 5)
        return 0;
    if (dp[ind][W]>0)
        return dp[ind][W];
    if (wt[ind]>W)
    {
        dp[ind][W] = recurse (val,wt,ind+1,W);
    }
    else{
    dp[ind][W] =  max(val[ind] + recurse(val,wt,ind+1,W-wt[ind]),recurse(val,wt,ind+1,W));
    }
    //cout<< ind << " " << dp[ind][W]<<" "<<wt[ind]<<" "<<W<<endl;
    return dp[ind][W];
}
int main (int argc, char * argv[])
{
    for (int i = 0; i < 5; i++)
        for (int j = 0; j < 5; j++)
            dp[i][j] = 0;
    int val[5] = {1,3,7,6,5};
    int wt[5] = {3,5,4,2,3};
   cout<<recurse (val,wt,0,9)<<endl;    
}
